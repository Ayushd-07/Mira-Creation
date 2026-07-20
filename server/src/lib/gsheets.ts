import { google } from 'googleapis'
import { prisma } from './prisma.js'

export interface IncrementalSyncResult {
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

let isSyncRunning = false

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

export async function syncGoogleSheetsIncremental(triggerType: 'manual' | 'cron', triggeredBy: string = 'System'): Promise<IncrementalSyncResult> {
  if (isSyncRunning) {
    return {
      status: 'already_running',
      message: 'A backup synchronization is already in progress.',
      added: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      totalRecords: 0,
      completedAt: new Date()
    }
  }

  isSyncRunning = true
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
      'Users',
      'Company Settings',
      'Backup Activity'
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

    // 2. Query production database tables
    const dbTables = [
      { name: 'users', modelName: 'user' },
      { name: 'workers', modelName: 'worker' },
      { name: 'incoming', modelName: 'incomingStock' },
      { name: 'outgoing', modelName: 'outgoingStock' },
      { name: 'production', modelName: 'productionLog' },
      { name: 'departments', modelName: 'department' },
      { name: 'settings', modelName: 'settings' },
      { name: 'items', modelName: 'item' },
      { name: 'audit-logs', modelName: 'auditLog' }
    ]

    const dbData: Record<string, any[]> = {}
    let totalRecords = 0

    for (const tbl of dbTables) {
      let result: any[] = []
      try {
        if ((prisma as any)[tbl.modelName]) {
          result = await (prisma as any)[tbl.modelName].findMany()
        }
      } catch {
        continue
      }
      dbData[tbl.name] = result
      totalRecords += Array.isArray(result) ? result.length : 0
    }

    // Sanitize user secrets
    if (dbData.users) {
      dbData.users = dbData.users.map((u) => ({
        ...u,
        password: '[REDACTED_PASSWORD_HASH]',
        resetToken: null,
        resetTokenExpiry: null
      }))
    }

    let globalAdded = 0
    let globalUpdated = 0
    let globalDeleted = 0
    let globalUnchanged = 0

    // Helper for syncing individual business table sheets
    const syncTableSheet = async (
      sheetTitle: string,
      headers: string[],
      currentDbRecords: any[],
      rowsMapper: (record: any) => { recordId: string; rowValues: any[] }
    ) => {
      // Fetch existing rows from Google Sheet
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetTitle}'!A1:Z`
      })

      const existingRows = res.data.values || []

      // If header is missing or empty, write header
      if (existingRows.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetTitle}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] }
        })
      }

      const existingRecordMap = new Map<string, { rowIndex: number; rowValues: string[]; hash: string; status: string }>()

      // Index existing rows (1-indexed in Google Sheets)
      for (let i = 1; i < existingRows.length; i++) {
        const row = existingRows[i]
        const recId = normalizeValue(row[0])
        if (recId && recId !== '-') {
          const status = normalizeValue(row[headers.length - 2]) || 'Active'
          const dataValues = row.slice(1, headers.length - 2)
          existingRecordMap.set(recId, {
            rowIndex: i + 1,
            rowValues: row,
            hash: computeContentHash(dataValues),
            status
          })
        }
      }

      const activeDbRecordIds = new Set<string>()
      const rowsToAppend: any[][] = []
      const batchUpdateRequests: any[] = []

      currentDbRecords.forEach((record: any) => {
        const { recordId, rowValues } = rowsMapper(record)
        activeDbRecordIds.add(recordId)

        const currentHash = computeContentHash(rowValues)
        const fullRow = [recordId, ...rowValues, 'Active', '-']

        if (existingRecordMap.has(recordId)) {
          const existing = existingRecordMap.get(recordId)!
          if (existing.hash !== currentHash || existing.status === 'Deleted') {
            // Updated record
            globalUpdated++
            batchUpdateRequests.push({
              range: `'${sheetTitle}'!A${existing.rowIndex}`,
              values: [fullRow]
            })
          } else {
            // Unchanged record
            globalUnchanged++
          }
        } else {
          // New record
          globalAdded++
          rowsToAppend.push(fullRow)
        }
      })

      // Check for records that were deleted in database
      existingRecordMap.forEach((existing, recId) => {
        if (!activeDbRecordIds.has(recId) && existing.status !== 'Deleted') {
          globalDeleted++
          const deletedRow = [...existing.rowValues]
          deletedRow[headers.length - 2] = 'Deleted'
          deletedRow[headers.length - 1] = formatDateTime(new Date())
          batchUpdateRequests.push({
            range: `'${sheetTitle}'!A${existing.rowIndex}`,
            values: [deletedRow]
          })
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
          range: `'${sheetTitle}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rowsToAppend }
        })
      }
    }

    // 3. Sync Table Worksheets
    // Item Master
    await syncTableSheet(
      'Item Master',
      ['Record ID', 'Item Code', 'Item Name', 'Fabric Name', 'Status', 'Image URL', 'Created Date', 'Backup Status', 'Deleted At'],
      dbData.items || [],
      (item) => ({
        recordId: String(item.id || item.itemCode),
        rowValues: [
          item.itemCode || '-',
          item.itemName || '-',
          item.fabricName || '-',
          item.status || 'Active',
          item.itemImage ? item.itemImage : '-',
          formatDate(item.createdAt)
        ]
      })
    )

    // Incoming Stock
    await syncTableSheet(
      'Incoming Stock',
      ['Record ID', 'Sr / Batch No', 'Date', 'Fabric / Item', 'Supplier', 'Pieces', 'Rate (₹)', 'Total Cost (₹)', 'Notes', 'Backup Status', 'Deleted At'],
      dbData.incoming || [],
      (inc) => ({
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
    )

    // Outgoing Stock
    await syncTableSheet(
      'Outgoing Stock',
      ['Record ID', 'Sr / Challan No', 'Date', 'Fabric / Item', 'Customer', 'Pieces', 'Rate (₹)', 'Total Amount (₹)', 'Dispatch Date', 'Vehicle Number', 'Status', 'Backup Status', 'Deleted At'],
      dbData.outgoing || [],
      (out) => ({
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
    )

    // Workers
    await syncTableSheet(
      'Workers',
      ['Record ID', 'Worker ID', 'Name', 'Department', 'Phone', 'Salary (₹)', 'Joining Date', 'Status', 'Backup Status', 'Deleted At'],
      dbData.workers || [],
      (w) => ({
        recordId: String(w.id || w.workerId),
        rowValues: [
          w.workerId || '-',
          w.name || '-',
          w.department || 'General',
          w.phone || '-',
          Number(w.salary) || 0,
          formatDate(w.joiningDate),
          w.status || 'Active'
        ]
      })
    )

    // Production Logs
    await syncTableSheet(
      'Production Logs',
      ['Record ID', 'Date', 'Department', 'Worker Name', 'Design / Item', 'Pieces', 'Rate (₹)', 'Total (₹)', 'Status', 'Backup Status', 'Deleted At'],
      dbData.production || [],
      (p) => ({
        recordId: String(p.id),
        rowValues: [
          formatDate(p.date),
          p.department || '-',
          p.workerName || p.worker?.name || '-',
          p.design || '-',
          Number(p.pieces) || 0,
          Number(p.rate) || 0,
          Number(p.total) || 0,
          p.status || 'Completed'
        ]
      })
    )

    // Departments
    await syncTableSheet(
      'Departments',
      ['Record ID', 'Department Name', 'Description', 'Created At', 'Backup Status', 'Deleted At'],
      dbData.departments || [],
      (d) => ({
        recordId: String(d.id),
        rowValues: [
          d.name || '-',
          d.description || '-',
          formatDate(d.createdAt)
        ]
      })
    )

    // System Users
    await syncTableSheet(
      'Users',
      ['Record ID', 'Name', 'Email', 'Role', 'Status', 'Created Date', 'Backup Status', 'Deleted At'],
      dbData.users || [],
      (u) => ({
        recordId: String(u.id),
        rowValues: [
          u.name || '-',
          u.email || '-',
          u.role || 'worker',
          u.resetToken ? 'Pending' : 'Active',
          formatDate(u.createdAt)
        ]
      })
    )

    const changesCount = globalAdded + globalUpdated + globalDeleted

    // 4. Update Dashboard Summary & Backup Activity only if changes occurred or first run
    if (changesCount > 0) {
      const summaryValues = [
        ['MIRA CREATION ERP'],
        ['Automatic Google Sheets Backup Summary'],
        [''],
        ['Last Successful Data Sync:', formatDateTime(startedAt)],
        ['Sync Status:', 'Successful'],
        [''],
        ['Metric', 'Value'],
        ['Total Items', (dbData.items || []).length],
        ['Total Incoming Batches', (dbData.incoming || []).length],
        ['Total Outgoing Batches', (dbData.outgoing || []).length],
        ['Total Workers', (dbData.workers || []).length],
        ['Total Production Logs', (dbData.production || []).length],
        ['Total Users', (dbData.users || []).length]
      ]

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'Dashboard Summary'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: summaryValues }
      })
    }

    // Append to Backup Activity sheet
    const activityResultText = changesCount === 0
      ? 'Already Up to Date'
      : `Success (${globalAdded} added, ${globalUpdated} updated, ${globalDeleted} deleted)`

    const activityRow = [
      formatDateTime(startedAt),
      triggerType.toUpperCase(),
      triggeredBy,
      activityResultText,
      globalAdded,
      globalUpdated,
      globalDeleted,
      globalUnchanged
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'Backup Activity'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['Timestamp', 'Trigger Type', 'Triggered By', 'Result', 'Added', 'Updated', 'Deleted', 'Unchanged'],
          activityRow
        ]
      }
    })

    if (changesCount === 0) {
      return {
        status: 'up_to_date',
        message: 'Everything is already up to date. No new changes to backup.',
        added: 0,
        updated: 0,
        deleted: 0,
        unchanged: globalUnchanged,
        totalRecords,
        completedAt: new Date()
      }
    }

    let summaryMsg = 'Backup completed successfully.'
    const detailsArr: string[] = []
    if (globalAdded > 0) detailsArr.push(`${globalAdded} new record${globalAdded > 1 ? 's' : ''} added`)
    if (globalUpdated > 0) detailsArr.push(`${globalUpdated} record${globalUpdated > 1 ? 's' : ''} updated`)
    if (globalDeleted > 0) detailsArr.push(`${globalDeleted} record${globalDeleted > 1 ? 's' : ''} marked deleted`)
    if (detailsArr.length > 0) {
      summaryMsg += ` ${detailsArr.join(' and ')}.`
    }

    return {
      status: 'success',
      message: summaryMsg,
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
    } else if (err.message && err.message.includes('Requested entity was not found')) {
      userMsg = `Spreadsheet Not Found: Please verify that GOOGLE_SPREADSHEET_ID in Vercel environment variables is set to the correct Google Spreadsheet ID.`
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
    isSyncRunning = false
  }
}
