import { google } from 'googleapis'
import { prisma } from './prisma.js'

export interface SyncResult {
  status: 'success' | 'up_to_date' | 'already_running' | 'failed'
  message: string
  added: number
  updated: number
  deleted: number
  unchanged: number
  totalRecords: number
  completedAt: Date
  error?: string
}

let isReconcileRunning = false

function getSheetsClient() {
  const serviceAccountEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim()
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim()

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY) are missing in environment variables.')
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  return google.sheets({ version: 'v4', auth })
}

function parseSpreadsheetId(): string {
  const id = (process.env.GOOGLE_SPREADSHEET_ID || '').trim()
  if (!id) {
    throw new Error('GOOGLE_SPREADSHEET_ID is not configured in environment variables.')
  }
  return id
}

function formatDate(val: any): string {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  } catch {
    return String(val)
  }
}

function formatDateTime(val: any): string {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  } catch {
    return String(val)
  }
}

function normalizeValue(val: any): string {
  if (val === null || val === undefined || val === '') return '-'
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).trim()
}

function computeContentHash(values: any[]): string {
  return values.map(v => normalizeValue(v)).join('|')
}

// Module Configuration Map
export interface ModuleConfig {
  sheetTitle: string
  headers: string[]
  mapper: (record: any) => { recordId: string; rowValues: any[] }
}

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  item: {
    sheetTitle: 'Item Master',
    headers: ['Record ID', 'Item Code', 'Item Name', 'Fabric Name', 'Status', 'Image URL', 'Remark', 'Created Date'],
    mapper: (item) => ({
      recordId: String(item.id || item.itemCode),
      rowValues: [
        item.itemCode || '-',
        item.itemName || '-',
        item.fabricName || '-',
        item.status || 'Active',
        item.itemImage ? item.itemImage : '-',
        item.remark || '-',
        formatDate(item.createdAt)
      ]
    })
  },
  incomingStock: {
    sheetTitle: 'Incoming Stock',
    headers: ['Record ID', 'Sr / Batch No', 'Date', 'Fabric / Item', 'Supplier', 'Pieces', 'Rate (₹)', 'Total Cost (₹)', 'Notes'],
    mapper: (inc) => ({
      recordId: String(inc.id || inc.srNo),
      rowValues: [
        inc.srNo || inc.id?.slice(0, 8) || '-',
        formatDate(inc.date),
        inc.fabric || inc.design || inc.item?.itemName || inc.item?.fabricName || '-',
        inc.supplier || '-',
        Number(inc.pieces) || 0,
        Number(inc.rate) || 0,
        Number(inc.total) || 0,
        inc.notes || '-'
      ]
    })
  },
  outgoingStock: {
    sheetTitle: 'Outgoing Stock',
    headers: ['Record ID', 'Sr / Challan No', 'Date', 'Fabric / Item', 'Customer', 'Pieces', 'Rate (₹)', 'Total Amount (₹)', 'Dispatch Date', 'Vehicle Number', 'Status'],
    mapper: (out) => ({
      recordId: String(out.id || out.srNo),
      rowValues: [
        out.srNo || out.id?.slice(0, 8) || '-',
        formatDate(out.date),
        out.fabric || out.design || out.item?.itemName || out.item?.fabricName || '-',
        out.customer || '-',
        Number(out.pieces) || 0,
        Number(out.rate) || 0,
        Number(out.total) || 0,
        formatDate(out.dispatchDate),
        out.vehicleNumber || '-',
        out.status || 'Pending'
      ]
    })
  },
  worker: {
    sheetTitle: 'Workers',
    headers: ['Record ID', 'Worker ID', 'Name', 'Department', 'Phone', 'Email', 'Address', 'Salary (₹)', 'Joining Date', 'Status'],
    mapper: (w) => ({
      recordId: String(w.id || w.workerId),
      rowValues: [
        w.workerId || '-',
        w.name || '-',
        w.department || 'General',
        w.phone || '-',
        w.email || '-',
        w.address || '-',
        Number(w.salary) || 0,
        formatDate(w.joiningDate),
        w.status || 'Active'
      ]
    })
  },
  productionLog: {
    sheetTitle: 'Production Logs',
    headers: ['Record ID', 'Date', 'Department', 'Worker Name', 'Design / Item', 'Pieces', 'Rate (₹)', 'Total (₹)', 'Status', 'Notes'],
    mapper: (p) => ({
      recordId: String(p.id),
      rowValues: [
        formatDate(p.date),
        p.department || '-',
        p.workerName || p.worker?.name || '-',
        p.design || '-',
        Number(p.pieces) || 0,
        Number(p.rate) || 0,
        Number(p.total) || 0,
        p.status || 'Completed',
        p.notes || '-'
      ]
    })
  },
  department: {
    sheetTitle: 'Departments',
    headers: ['Record ID', 'Department Name', 'Description', 'Created Date'],
    mapper: (d) => ({
      recordId: String(d.id),
      rowValues: [
        d.name || '-',
        d.description || '-',
        formatDate(d.createdAt)
      ]
    })
  },
  user: {
    sheetTitle: 'Users',
    headers: ['Record ID', 'Name', 'Email', 'Role', 'Status', 'Created Date'],
    mapper: (u) => ({
      recordId: String(u.id),
      rowValues: [
        u.name || '-',
        u.email || '-',
        u.role || 'worker',
        u.resetToken ? 'Pending' : 'Active',
        formatDate(u.createdAt)
      ]
    })
  }
}

// 1. REALTIME SINGLE RECORD CREATE
export async function syncRecordCreate(moduleKey: string, record: any): Promise<void> {
  try {
    const config = MODULE_CONFIGS[moduleKey]
    if (!config) return

    const sheets = getSheetsClient()
    const spreadsheetId = parseSpreadsheetId()
    const { recordId, rowValues } = config.mapper(record)
    const fullRow = [recordId, ...rowValues]

    // Fetch existing rows to prevent duplicate
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${config.sheetTitle}'!A1:A`
    })
    const existingIds = (res.data.values || []).map(r => normalizeValue(r[0]))
    if (existingIds.includes(recordId)) {
      // Record already exists, update instead
      await syncRecordUpdate(moduleKey, recordId, record)
      return
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${config.sheetTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fullRow] }
    })

    console.log(`[Google Sheets Sync] ${config.sheetTitle} record created: ${recordId}`)
    await updateDashboardSummary()
  } catch (err: any) {
    console.error(`[Google Sheets Sync Error] ${moduleKey} create failed:`, err.message)
  }
}

// 2. REALTIME SINGLE RECORD UPDATE
export async function syncRecordUpdate(moduleKey: string, recordId: string, record: any): Promise<void> {
  try {
    const config = MODULE_CONFIGS[moduleKey]
    if (!config) return

    const sheets = getSheetsClient()
    const spreadsheetId = parseSpreadsheetId()
    const { rowValues } = config.mapper(record)
    const fullRow = [recordId, ...rowValues]

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${config.sheetTitle}'!A1:A`
    })
    const existingIds = (res.data.values || []).map(r => normalizeValue(r[0]))
    const rowIndex = existingIds.indexOf(recordId)

    if (rowIndex === -1) {
      // Record not found in Google Sheets, append as new
      await syncRecordCreate(moduleKey, record)
      return
    }

    // Update row in-place (1-indexed in Google Sheets)
    const gRow = rowIndex + 1
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${config.sheetTitle}'!A${gRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fullRow] }
    })

    console.log(`[Google Sheets Sync] ${config.sheetTitle} row ${gRow} updated: ${recordId}`)
    await updateDashboardSummary()
  } catch (err: any) {
    console.error(`[Google Sheets Sync Error] ${moduleKey} update failed:`, err.message)
  }
}

// 3. REALTIME SINGLE RECORD PHYSICAL DELETE
export async function syncRecordDelete(moduleKey: string, recordId: string): Promise<void> {
  try {
    const config = MODULE_CONFIGS[moduleKey]
    if (!config) return

    const sheets = getSheetsClient()
    const spreadsheetId = parseSpreadsheetId()

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetMeta = (spreadsheet.data.sheets || []).find(s => s.properties?.title === config.sheetTitle)
    const sheetId = sheetMeta?.properties?.sheetId
    if (sheetId === undefined || sheetId === null) return

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${config.sheetTitle}'!A1:A`
    })
    const existingIds = (res.data.values || []).map(r => normalizeValue(r[0]))
    const rowIndex = existingIds.indexOf(recordId)

    if (rowIndex === -1) return

    // Issue batchUpdate deleteDimension to physically remove the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex, // 0-indexed start
                endIndex: rowIndex + 1 // 0-indexed end (exclusive)
              }
            }
          }
        ]
      }
    })

    console.log(`[Google Sheets Sync] ${config.sheetTitle} row ${rowIndex + 1} physically deleted: ${recordId}`)
    await updateDashboardSummary()
  } catch (err: any) {
    console.error(`[Google Sheets Sync Error] ${moduleKey} delete failed:`, err.message)
  }
}

// 4. UPDATE DASHBOARD SUMMARY IN-PLACE
export async function updateDashboardSummary(): Promise<void> {
  try {
    const sheets = getSheetsClient()
    const spreadsheetId = parseSpreadsheetId()

    const [itemsCount, incomingRows, outgoingRows, workersCount, prodCount, usersCount] = await Promise.all([
      prisma.item.count(),
      prisma.incomingStock.findMany({ select: { pieces: true } }),
      prisma.outgoingStock.findMany({ select: { pieces: true } }),
      prisma.worker.count(),
      prisma.productionLog.count(),
      prisma.user.count()
    ])

    const totalIncomingPieces = incomingRows.reduce((acc, r) => acc + (r.pieces || 0), 0)
    const totalOutgoingPieces = outgoingRows.reduce((acc, r) => acc + (r.pieces || 0), 0)

    const summaryValues = [
      ['MIRA CREATION ERP'],
      ['Live Database Sync Mirror Dashboard'],
      [''],
      ['Last Successful Sync:', formatDateTime(new Date())],
      ['Sync Mode:', 'Real-time Live Database Mirror'],
      [''],
      ['Metric', 'Value'],
      ['Total Items', itemsCount],
      ['Total Incoming Pieces', totalIncomingPieces],
      ['Total Outgoing Pieces', totalOutgoingPieces],
      ['Current Stock (Pieces)', Math.max(0, totalIncomingPieces - totalOutgoingPieces)],
      ['Total Workers', workersCount],
      ['Total Production Logs', prodCount],
      ['Total Users', usersCount]
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'Dashboard Summary'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: summaryValues }
    })
  } catch (err: any) {
    // Non-critical dashboard summary error
  }
}

// 5. FULL RECONCILIATION ("BACKUP NOW")
export async function reconcileAllSheets(): Promise<SyncResult> {
  if (isReconcileRunning) {
    return {
      status: 'already_running',
      message: 'A Google Sheets synchronization is already in progress.',
      added: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      totalRecords: 0,
      completedAt: new Date()
    }
  }

  isReconcileRunning = true
  const startedAt = new Date()

  try {
    const sheets = getSheetsClient()
    const spreadsheetId = parseSpreadsheetId()

    // 1. Ensure sheet tabs exist
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const existingSheetTitles = (spreadsheet.data.sheets || []).map(s => s.properties?.title || '')

    const requiredTabs = [
      'Dashboard Summary',
      'Item Master',
      'Incoming Stock',
      'Outgoing Stock',
      'Workers',
      'Production Logs',
      'Departments',
      'Users'
    ]

    const newRequests: any[] = []
    requiredTabs.forEach(tab => {
      if (!existingSheetTitles.includes(tab)) {
        newRequests.push({ addSheet: { properties: { title: tab } } })
      }
    })

    if (newRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: newRequests }
      })
    }

    // 2. Fetch all DB data
    const [dbItems, dbIncoming, dbOutgoing, dbWorkers, dbProd, dbDepts, dbUsers] = await Promise.all([
      prisma.item.findMany(),
      prisma.incomingStock.findMany(),
      prisma.outgoingStock.findMany(),
      prisma.worker.findMany(),
      prisma.productionLog.findMany(),
      prisma.department.findMany(),
      prisma.user.findMany()
    ])

    const moduleDataMap: Record<string, any[]> = {
      item: dbItems,
      incomingStock: dbIncoming,
      outgoingStock: dbOutgoing,
      worker: dbWorkers,
      productionLog: dbProd,
      department: dbDepts,
      user: dbUsers.map(u => ({ ...u, password: '[REDACTED]' }))
    }

    let globalAdded = 0
    let globalUpdated = 0
    let globalDeleted = 0
    let globalUnchanged = 0
    let totalRecords = 0

    // Reconcile module sheet
    for (const [moduleKey, config] of Object.entries(MODULE_CONFIGS)) {
      const dbRecords = moduleDataMap[moduleKey] || []
      totalRecords += dbRecords.length

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${config.sheetTitle}'!A1:Z`
      })

      const existingRows = res.data.values || []

      // Write header if missing
      if (existingRows.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${config.sheetTitle}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [config.headers] }
        })
      }

      const existingRecordMap = new Map<string, { rowIndex: number; rowValues: string[]; hash: string }>()

      // Index existing rows (1-indexed)
      for (let i = 1; i < existingRows.length; i++) {
        const row = existingRows[i]
        const recId = normalizeValue(row[0])
        if (recId && recId !== '-') {
          const dataValues = row.slice(1, config.headers.length)
          existingRecordMap.set(recId, {
            rowIndex: i + 1,
            rowValues: row,
            hash: computeContentHash(dataValues)
          })
        }
      }

      const activeDbRecordIds = new Set<string>()
      const rowsToAppend: any[][] = []
      const batchUpdateRequests: any[] = []
      const rowsToDeleteIndexes: number[] = []

      dbRecords.forEach(record => {
        const { recordId, rowValues } = config.mapper(record)
        activeDbRecordIds.add(recordId)

        const currentHash = computeContentHash(rowValues)
        const fullRow = [recordId, ...rowValues]

        if (existingRecordMap.has(recordId)) {
          const existing = existingRecordMap.get(recordId)!
          if (existing.hash !== currentHash) {
            globalUpdated++
            batchUpdateRequests.push({
              range: `'${config.sheetTitle}'!A${existing.rowIndex}`,
              values: [fullRow]
            })
          } else {
            globalUnchanged++
          }
        } else {
          globalAdded++
          rowsToAppend.push(fullRow)
        }
      })

      // Identify rows that no longer exist in DB to physically delete
      existingRecordMap.forEach((existing, recId) => {
        if (!activeDbRecordIds.has(recId)) {
          globalDeleted++
          rowsToDeleteIndexes.push(existing.rowIndex - 1) // 0-indexed
        }
      })

      // Execute batch updates
      if (batchUpdateRequests.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: batchUpdateRequests
          }
        })
      }

      // Execute appends
      if (rowsToAppend.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${config.sheetTitle}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rowsToAppend }
        })
      }

      // Execute physical row deletions (delete from bottom to top to preserve index offset)
      if (rowsToDeleteIndexes.length > 0) {
        const sheetMeta = (spreadsheet.data.sheets || []).find(s => s.properties?.title === config.sheetTitle)
        const sheetId = sheetMeta?.properties?.sheetId
        if (sheetId !== undefined && sheetId !== null) {
          rowsToDeleteIndexes.sort((a, b) => b - a)
          const deleteRequests = rowsToDeleteIndexes.map(rIdx => ({
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rIdx,
                endIndex: rIdx + 1
              }
            }
          }))

          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests: deleteRequests }
          })
        }
      }

      // Format sheet header and freeze row
      try {
        const sheetMeta = (spreadsheet.data.sheets || []).find(s => s.properties?.title === config.sheetTitle)
        const sheetId = sheetMeta?.properties?.sheetId
        if (sheetId !== undefined && sheetId !== null) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  updateSheetProperties: {
                    properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                    fields: 'gridProperties.frozenRowCount'
                  }
                },
                {
                  repeatCell: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                    cell: {
                      userEnteredFormat: {
                        backgroundColor: { red: 0.12, green: 0.16, blue: 0.23 },
                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10, fontFamily: 'Arial' },
                        horizontalAlignment: 'CENTER',
                        verticalAlignment: 'MIDDLE'
                      }
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                  }
                },
                {
                  autoResizeDimensions: {
                    dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: config.headers.length }
                  }
                }
              ]
            }
          })
        }
      } catch {
        // Non-critical formatting warning
      }
    }

    await updateDashboardSummary()

    const totalChanges = globalAdded + globalUpdated + globalDeleted

    if (totalChanges === 0) {
      return {
        status: 'up_to_date',
        message: 'Everything is already up to date. No changes were required.',
        added: 0,
        updated: 0,
        deleted: 0,
        unchanged: globalUnchanged,
        totalRecords,
        completedAt: new Date()
      }
    }

    return {
      status: 'success',
      message: `Google Sheets synchronized successfully. All records are up to date (${globalAdded} added, ${globalUpdated} updated, ${globalDeleted} deleted).`,
      added: globalAdded,
      updated: globalUpdated,
      deleted: globalDeleted,
      unchanged: globalUnchanged,
      totalRecords,
      completedAt: new Date()
    }
  } catch (err: any) {
    let userMsg = err.message || 'Synchronization failed.'
    if (err.message && err.message.includes('Google Sheets API has not been used in project')) {
      const projMatch = err.message.match(/project (\d+)/)
      const projId = projMatch ? projMatch[1] : '22358246699'
      userMsg = `Google Sheets API is disabled in Google Cloud Console project ${projId}. Please enable it at: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=${projId}`
    } else if (err.message && (err.message.includes('caller does not have permission') || err.message.includes('permission'))) {
      const saEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'your Service Account email').trim()
      userMsg = `Permission Denied: Please open your Google Spreadsheet, click 'Share' in the top-right, add '${saEmail}', and set permission to Editor.`
    }

    return {
      status: 'failed',
      message: userMsg,
      added: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      totalRecords: 0,
      completedAt: new Date(),
      error: userMsg
    }
  } finally {
    isReconcileRunning = false
  }
}
