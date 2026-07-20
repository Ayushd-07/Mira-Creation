import { google } from 'googleapis'
import { prisma } from './prisma.js'
import { Readable } from 'stream'
import axios from 'axios'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { supabase, useSupabaseStorage } from './supabase.js'

// Helper to convert Buffer to Readable Stream for googleapis media body
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

export interface BackupResult {
  status: 'success' | 'failed'
  type: 'manual' | 'cron'
  startedAt: Date
  completedAt: Date
  recordCount: number
  fileCount: number
  failedFilesCount: number
  error?: string
}

export async function runBackup(type: 'manual' | 'cron'): Promise<BackupResult> {
  const startedAt = new Date()
  let recordCount = 0
  let fileCount = 0
  let failedFilesCount = 0
  let errorMessage: string | undefined = undefined

  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    let privateKey = process.env.GOOGLE_PRIVATE_KEY

    if (!folderId || !clientEmail || !privateKey) {
      throw new Error('Missing Google Drive credentials in environment variables. (GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)')
    }

    // Fix private key formatting from environment variable
    privateKey = privateKey.replace(/\\n/g, '\n')

    // 1. Initialize Google Auth JWT Client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive']
    })

    const drive = google.drive({ version: 'v3', auth })

    console.log('[Backup Engine] Starting Google Drive Backup...')

    // 2. Ensure subfolder structure exists
    const dbFolderId = await getOrCreateSubfolder(drive, folderId, 'database')
    const imagesFolderId = await getOrCreateSubfolder(drive, folderId, 'images')
    const metadataFolderId = await getOrCreateSubfolder(drive, folderId, 'metadata')
    const archiveFolderId = await getOrCreateSubfolder(drive, folderId, 'archive')
    const deletedFilesFolderId = await getOrCreateSubfolder(drive, archiveFolderId, 'deleted-files')

    const itemImagesFolderId = await getOrCreateSubfolder(drive, imagesFolderId, 'item-images')
    const logosFolderId = await getOrCreateSubfolder(drive, imagesFolderId, 'logos')
    const otherStorageFolderId = await getOrCreateSubfolder(drive, imagesFolderId, 'other-storage-files')

    // 3. Database Backup & Safety Checks
    const tables = [
      { name: 'users', modelName: 'user' },
      { name: 'workers', modelName: 'worker' },
      { name: 'incoming', modelName: 'incomingStock' },
      { name: 'outgoing', modelName: 'outgoingStock' },
      { name: 'production', modelName: 'productionLog' },
      { name: 'departments', modelName: 'department' },
      { name: 'settings', modelName: 'settings' },
      { name: 'items', modelName: 'item' },
      { name: 'audit-logs', modelName: 'auditLog' },
      { name: 'backup-logs', modelName: 'backupLog' }
    ]

    for (const table of tables) {
      console.log(`[Backup Engine] Backing up table: ${table.name}`)
      const queryResult = await (prisma as any)[table.modelName].findMany()
      const recordLength = Array.isArray(queryResult) ? queryResult.length : 0

      // Generate complete new JSON content first
      const jsonContent = JSON.stringify(queryResult, null, 2)
      
      // Validate generated JSON structure before replacing
      try {
        JSON.parse(jsonContent)
      } catch (jsonErr) {
        throw new Error(`Generated JSON for table ${table.name} is invalid. Aborting overwrite.`)
      }

      const fileName = `${table.name}.json`

      // --- Safety Validation Checks ---
      // Fetch existing file content size from Google Drive
      const prevFileId = await findFileInFolder(drive, dbFolderId, fileName)
      if (prevFileId) {
        const driveFile = await drive.files.get({
          fileId: prevFileId,
          fields: 'size'
        })
        const driveFileSize = driveFile.data.size ? parseInt(driveFile.data.size, 10) : 0
        
        // Safety trigger: If DB query unexpectedly yields 0 records but previous backup was non-empty (>5 bytes)
        if (recordLength === 0 && driveFileSize > 5) {
          console.warn(`[Backup Engine] Safety trigger: table ${table.name} query returned 0 records, but previous backup had content. Skipping overwrite.`)
          throw new Error(`Safety Warning: Database table ${table.name} unexpectedly returned 0 records while previous backup contains data. Overwrite aborted.`)
        }
      }

      // Safe replacement: Only replace Google Drive file after new content is completely generated and validated
      await uploadOrUpdateFile(drive, dbFolderId, fileName, 'application/json', jsonContent)
      recordCount += recordLength
    }

    // 4. Image & File Synchronization
    const activeFilesMap = new Map<string, { folderId: string; urlOrPath: string }>()

    // Settings Logos
    const settingsList = await prisma.settings.findMany()
    for (const s of settingsList) {
      if (s.logo) {
        const logoName = getFileNameFromUrlOrPath(s.logo)
        activeFilesMap.set(logoName, { folderId: logosFolderId, urlOrPath: s.logo })
      }
    }

    // Item Images
    const itemsList = await prisma.item.findMany()
    for (const item of itemsList) {
      if (item.itemImage) {
        const imgName = getFileNameFromUrlOrPath(item.itemImage)
        activeFilesMap.set(imgName, { folderId: itemImagesFolderId, urlOrPath: item.itemImage })
      }
    }

    // User Avatars
    const usersList = await prisma.user.findMany()
    for (const u of usersList) {
      if (u.avatar) {
        const avatarName = getFileNameFromUrlOrPath(u.avatar)
        activeFilesMap.set(avatarName, { folderId: otherStorageFolderId, urlOrPath: u.avatar })
      }
    }

    // Worker Avatars
    const workersList = await prisma.worker.findMany()
    for (const w of workersList) {
      if (w.avatar) {
        const avatarName = getFileNameFromUrlOrPath(w.avatar)
        activeFilesMap.set(avatarName, { folderId: otherStorageFolderId, urlOrPath: w.avatar })
      }
    }

    // Supabase Storage Bucket Files (if Supabase Storage is configured)
    if (useSupabaseStorage() && supabase) {
      try {
        const { data: supaFiles, error: supaErr } = await supabase.storage.from('item-images').list()
        if (!supaErr && supaFiles) {
          for (const sFile of supaFiles) {
            if (sFile.name && !sFile.name.startsWith('.')) {
              const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(sFile.name)
              if (urlData?.publicUrl && !activeFilesMap.has(sFile.name)) {
                activeFilesMap.set(sFile.name, { folderId: itemImagesFolderId, urlOrPath: urlData.publicUrl })
              }
            }
          }
        }
      } catch (sListErr) {
        console.warn('[Backup Engine] Error listing Supabase Storage files:', sListErr)
      }
    }

    // List existing files inside Google Drive image folders to compute sync status and deletion delta
    const driveImageFolders = [
      { id: itemImagesFolderId, name: 'item-images' },
      { id: logosFolderId, name: 'logos' },
      { id: otherStorageFolderId, name: 'other-storage-files' }
    ]

    const driveFilesMap = new Map<string, { id: string; size: number; parentId: string }>()
    for (const folder of driveImageFolders) {
      const driveList = await drive.files.list({
        q: `'${folder.id}' in parents and trashed = false`,
        fields: 'files(id, name, size)',
        spaces: 'drive'
      })
      if (driveList.data.files) {
        for (const file of driveList.data.files) {
          if (file.name && file.id) {
            driveFilesMap.set(file.name, {
              id: file.id,
              size: file.size ? parseInt(file.size, 10) : 0,
              parentId: folder.id
            })
          }
        }
      }
    }

    // Sync active files
    for (const [fileName, fileInfo] of activeFilesMap.entries()) {
      try {
        const fileBuffer = await downloadFile(fileInfo.urlOrPath)
        if (!fileBuffer) {
          console.warn(`[Backup Engine] Failed to download active file: ${fileName}`)
          failedFilesCount++
          continue
        }

        const activeSize = fileBuffer.length
        const existingInDrive = driveFilesMap.get(fileName)

        // Skip upload if file size matches the existing file size in Google Drive
        if (existingInDrive && existingInDrive.size === activeSize && existingInDrive.parentId === fileInfo.folderId) {
          console.log(`[Backup Engine] Skipping identical file: ${fileName} (Size: ${activeSize} bytes)`)
          fileCount++
          continue
        }

        console.log(`[Backup Engine] Syncing file: ${fileName} (Size: ${activeSize} bytes)`)
        const mime = getMimeType(fileName)
        await uploadOrUpdateFile(drive, fileInfo.folderId, fileName, mime, fileBuffer)
        fileCount++
      } catch (fileErr) {
        console.error(`[Backup Engine] Error backing up file ${fileName}:`, fileErr)
        failedFilesCount++
      }
    }

    // Process deleted files (archive them in Google Drive archive/deleted-files instead of deleting permanently)
    for (const [fileName, driveFile] of driveFilesMap.entries()) {
      if (!activeFilesMap.has(fileName)) {
        console.log(`[Backup Engine] Archiving deleted production file: ${fileName}`)
        try {
          await drive.files.update({
            fileId: driveFile.id,
            addParents: deletedFilesFolderId,
            removeParents: driveFile.parentId,
            fields: 'id, parents'
          })
        } catch (archiveErr) {
          console.error(`[Backup Engine] Failed to archive deleted file ${fileName}:`, archiveErr)
        }
      }
    }

    // 5. Update backup-status.json metadata file
    const statusData = {
      lastSuccessfulBackup: startedAt.toISOString(),
      lastAttemptedBackup: startedAt.toISOString(),
      status: 'success',
      totalDatabaseRecords: recordCount,
      totalFiles: fileCount,
      failedFilesCount: failedFilesCount,
      error: null
    }
    await uploadOrUpdateFile(drive, metadataFolderId, 'backup-status.json', 'application/json', JSON.stringify(statusData, null, 2))

    console.log('[Backup Engine] Google Drive Backup successfully completed.')

  } catch (err: any) {
    console.error('[Backup Engine] Critical backup failure:', err)
    errorMessage = err.message || String(err)
    
    // Save failed attempt status metadata (safe version, hiding credentials or keys)
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      let privateKey = process.env.GOOGLE_PRIVATE_KEY

      if (folderId && clientEmail && privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n')
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/drive']
        })
        const drive = google.drive({ version: 'v3', auth })
        const metadataFolderId = await getOrCreateSubfolder(drive, folderId, 'metadata')

        // Fetch previous successful sync timestamp to preserve in status
        let lastSuccess = null
        try {
          const prevStatusText = await downloadDriveFileContent(drive, metadataFolderId, 'backup-status.json')
          if (prevStatusText) {
            const parsed = JSON.parse(prevStatusText)
            lastSuccess = parsed.lastSuccessfulBackup
          }
        } catch {
          // Ignore read failures of previous status
        }

        const sanitizedErr = errorMessage
          ? errorMessage
              .replace(/AIza[0-9A-Za-z-_]{35}/g, 'REDACTED')
              .replace(/Bearer\s+[A-Za-z0-9-_=.]+/g, 'REDACTED')
          : 'Unknown error'

        const statusData = {
          lastSuccessfulBackup: lastSuccess,
          lastAttemptedBackup: startedAt.toISOString(),
          status: 'failed',
          totalDatabaseRecords: recordCount,
          totalFiles: fileCount,
          failedFilesCount: failedFilesCount,
          error: sanitizedErr
        }
        await uploadOrUpdateFile(drive, metadataFolderId, 'backup-status.json', 'application/json', JSON.stringify(statusData, null, 2))
      }
    } catch (metaErr) {
      console.error('[Backup Engine] Failed to save failure metadata to Google Drive:', metaErr)
    }
  }

  const completedAt = new Date()
  const result: BackupResult = {
    status: errorMessage ? 'failed' : 'success',
    type,
    startedAt,
    completedAt,
    recordCount,
    fileCount,
    failedFilesCount,
    error: errorMessage
  }

  // Save the result to PostgreSQL BackupLog
  try {
    await (prisma as any).backupLog.create({
      data: {
        status: result.status,
        type: result.type,
        recordCount: result.recordCount,
        fileCount: result.fileCount,
        error: result.error ? result.error.substring(0, 500) : null,
        startedAt: result.startedAt,
        completedAt: result.completedAt
      }
    })
  } catch (dbErr) {
    console.error('[Backup Engine] Failed to write BackupLog to database:', dbErr)
  }

  return result
}

// Helper: Get or Create Google Drive subfolder
async function getOrCreateSubfolder(drive: any, parentId: string, name: string): Promise<string> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive'
  })
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id
  }
  const folderMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  }
  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  })
  return folder.data.id
}

// Helper: Upload file or update existing one in Google Drive
async function uploadOrUpdateFile(drive: any, parentId: string, name: string, mimeType: string, content: Buffer | string) {
  const existingId = await findFileInFolder(drive, parentId, name)
  const isStr = typeof content === 'string'
  const media = {
    mimeType,
    body: isStr ? Readable.from([content]) : bufferToStream(content as Buffer)
  }

  if (existingId) {
    await drive.files.update({
      fileId: existingId,
      media
    })
  } else {
    const fileMetadata = {
      name,
      parents: [parentId]
    }
    await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id'
    })
  }
}

// Helper: Find file in Google Drive folder
async function findFileInFolder(drive: any, parentId: string, name: string): Promise<string | null> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive'
  })
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id
  }
  return null
}

// Helper: Download Google Drive file text content
async function downloadDriveFileContent(drive: any, parentId: string, name: string): Promise<string | null> {
  const fileId = await findFileInFolder(drive, parentId, name)
  if (!fileId) return null
  const response = await drive.files.get({
    fileId,
    alt: 'media'
  }, { responseType: 'text' })
  return response.data as string
}

// Helper: Extract filename from URL or path
function getFileNameFromUrlOrPath(path: string): string {
  if (!path) return 'file.bin'
  const parts = path.split('?')[0].split('/')
  return parts[parts.length - 1] || 'file.bin'
}

// Helper: Download file binary buffer
async function downloadFile(urlOrPath: string): Promise<Buffer | null> {
  if (!urlOrPath) return null
  
  if (urlOrPath.startsWith('/uploads/')) {
    // Relative local path
    const filePath = join(process.cwd(), urlOrPath.replace(/^\//, ''))
    if (existsSync(filePath)) {
      try {
        return readFileSync(filePath)
      } catch (err) {
        console.error(`[Backup Engine] Local file read error: ${filePath}`, err)
      }
    }
    return null
  }

  // Remote cloud storage URL
  try {
    const response = await axios.get(urlOrPath, { responseType: 'arraybuffer', timeout: 15000 })
    return Buffer.from(response.data)
  } catch (err) {
    console.error(`[Backup Engine] Failed to download cloud file: ${urlOrPath}`, err)
    return null
  }
}

// Helper: Deduce MIME type
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'json': return 'application/json'
    default: return 'application/octet-stream'
  }
}

