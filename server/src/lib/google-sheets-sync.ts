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

export interface ModuleConfig {
  sheetTitle: string
  legacySheetTitles?: string[]
  headers: string[]
  mapper: (record: any, index?: number) => { recordId: string; rowValues: any[] }
}

// Business-aligned Module Configurations (Exact Website Columns + Hidden __SYNC_ID)
export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  item: {
    sheetTitle: 'Item Master',
    headers: ['SR NO', 'IMAGE', 'ITEM CODE', 'ITEM NAME', 'FABRIC NAME', 'REMARK', '__SYNC_ID'],
    mapper: (item, index) => ({
      recordId: String(item.id),
      rowValues: [
        index !== undefined ? index : '-',
        item.itemImage ? String(item.itemImage) : '-',
        item.itemCode || '-',
        item.itemName || '-',
        item.fabricName || '-',
        item.remark || '-'
      ]
    })
  },
  incomingStock: {
    sheetTitle: 'Incoming Stock',
    headers: ['DATE', 'SR NO', 'DESIGN', 'FABRIC', 'PIECES', 'RATE (₹)', 'TOTAL (₹)', '__SYNC_ID'],
    mapper: (inc) => ({
      recordId: String(inc.id),
      rowValues: [
        inc.date || '-',
        inc.srNo || '-',
        inc.design || '-',
        inc.fabric || '-',
        Number(inc.pieces) || 0,
        Number(inc.rate) || 0,
        Number(inc.total) || 0
      ]
    })
  },
  outgoingStock: {
    sheetTitle: 'Outgoing Stock',
    headers: ['DATE', 'SR NO', 'DESIGN', 'FABRIC', 'PIECES', 'RATE (₹)', 'TOTAL (₹)', '__SYNC_ID'],
    mapper: (out) => ({
      recordId: String(out.id),
      rowValues: [
        out.date || '-',
        out.srNo || '-',
        out.design || '-',
        out.fabric || '-',
        Number(out.pieces) || 0,
        Number(out.rate) || 0,
        Number(out.total) || 0
      ]
    })
  },
  productionLog: {
    sheetTitle: 'Worker Production',
    legacySheetTitles: ['Production Logs'],
    headers: ['DATE', 'DEPARTMENT', 'WORKER NAME', 'DESIGN / ITEM', 'PIECES', 'RATE (₹)', 'TOTAL (₹)', '__SYNC_ID'],
    mapper: (p) => ({
      recordId: String(p.id),
      rowValues: [
        p.date || '-',
        p.department || '-',
        p.workerName || p.worker?.name || '-',
        p.design || '-',
        Number(p.pieces) || 0,
        Number(p.rate) || 0,
        Number(p.total) || 0
      ]
    })
  },
  worker: {
    sheetTitle: 'Worker Management',
    legacySheetTitles: ['Workers'],
    headers: ['WORKER ID', 'NAME', 'DEPARTMENT', 'PHONE', 'EMAIL', 'JOINING DATE', 'ADDRESS', '__SYNC_ID'],
    mapper: (w) => ({
      recordId: String(w.id),
      rowValues: [
        w.workerId || '-',
        w.name || '-',
        w.department || '-',
        w.phone || '-',
        w.email || '-',
        w.joiningDate || '-',
        w.address || '-'
      ]
    })
  },
  department: {
    sheetTitle: 'Departments',
    headers: ['DEPARTMENT NAME', 'DESCRIPTION', '__SYNC_ID'],
    mapper: (d) => ({
      recordId: String(d.id),
      rowValues: [
        d.name || '-',
        d.description || '-'
      ]
    })
  }
}

// Column width specifications (in pixels)
const COLUMN_WIDTH_MAP: Record<string, number> = {
  'SR NO': 100,
  'IMAGE': 240,
  'ITEM CODE': 140,
  'ITEM NAME': 180,
  'FABRIC NAME': 180,
  'REMARK': 200,
  'DATE': 120,
  'DESIGN': 180,
  'DESIGN / ITEM': 180,
  'FABRIC': 180,
  'PIECES': 110,
  'RATE (₹)': 120,
  'TOTAL (₹)': 140,
  'WORKER ID': 130,
  'NAME': 180,
  'WORKER NAME': 180,
  'DEPARTMENT': 160,
  'DEPARTMENT NAME': 160,
  'PHONE': 140,
  'EMAIL': 200,
  'JOINING DATE': 130,
  'ADDRESS': 220,
  'DESCRIPTION': 220,
  '__SYNC_ID': 100
}

// 1. REALTIME SINGLE RECORD CREATE
export async function syncRecordCreate(moduleKey: string, record: any): Promise<void> {
  try {
    const config = MODULE_CONFIGS[moduleKey]
    if (!config) return

    const sheets = getSheetsClient()
    const spreadsheetId = parseSpreadsheetId()

    // Ensure sheet tab exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    let sheetMeta = (spreadsheet.data.sheets || []).find(s => s.properties?.title === config.sheetTitle)
    
    // Check legacy titles if title not found
    if (!sheetMeta && config.legacySheetTitles) {
      sheetMeta = (spreadsheet.data.sheets || []).find(s => config.legacySheetTitles?.includes(s.properties?.title || ''))
    }

    if (!sheetMeta) {
      await reconcileAllSheets()
      return
    }

    const targetTitle = sheetMeta.properties?.title || config.sheetTitle
    const syncIdIndex = config.headers.indexOf('__SYNC_ID')

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${targetTitle}'!A1:Z`
    })

    const existingRows = res.data.values || []
    const indexForSrNo = existingRows.length > 0 ? existingRows.length : 1
    const { recordId, rowValues } = config.mapper(record, indexForSrNo)

    // Build full row matching headers length
    const fullRow = new Array(config.headers.length).fill('-')
    for (let i = 0; i < rowValues.length; i++) {
      fullRow[i] = rowValues[i]
    }
    fullRow[syncIdIndex] = recordId

    // Check if recordId already exists in sheet
    for (let i = 1; i < existingRows.length; i++) {
      const existingSyncId = normalizeValue(existingRows[i][syncIdIndex])
      if (existingSyncId === recordId) {
        await syncRecordUpdate(moduleKey, recordId, record)
        return
      }
    }

    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${targetTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fullRow] }
    })

    console.log(`[Google Sheets Sync] ${targetTitle} record created: ${recordId}`)
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

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    let sheetMeta = (spreadsheet.data.sheets || []).find(s => s.properties?.title === config.sheetTitle)
    
    if (!sheetMeta && config.legacySheetTitles) {
      sheetMeta = (spreadsheet.data.sheets || []).find(s => config.legacySheetTitles?.includes(s.properties?.title || ''))
    }

    if (!sheetMeta) {
      await syncRecordCreate(moduleKey, record)
      return
    }

    const targetTitle = sheetMeta.properties?.title || config.sheetTitle
    const syncIdIndex = config.headers.indexOf('__SYNC_ID')

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${targetTitle}'!A1:Z`
    })

    const existingRows = res.data.values || []
    let rowIndex = -1

    for (let i = 1; i < existingRows.length; i++) {
      if (normalizeValue(existingRows[i][syncIdIndex]) === String(recordId)) {
        rowIndex = i
        break
      }
    }

    if (rowIndex === -1) {
      await syncRecordCreate(moduleKey, record)
      return
    }

    const { rowValues } = config.mapper(record, rowIndex)
    const fullRow = new Array(config.headers.length).fill('-')
    for (let i = 0; i < rowValues.length; i++) {
      fullRow[i] = rowValues[i]
    }
    fullRow[syncIdIndex] = String(recordId)

    const gRow = rowIndex + 1
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${targetTitle}'!A${gRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fullRow] }
    })

    console.log(`[Google Sheets Sync] ${targetTitle} row ${gRow} updated: ${recordId}`)
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
    let sheetMeta = (spreadsheet.data.sheets || []).find(s => s.properties?.title === config.sheetTitle)
    
    if (!sheetMeta && config.legacySheetTitles) {
      sheetMeta = (spreadsheet.data.sheets || []).find(s => config.legacySheetTitles?.includes(s.properties?.title || ''))
    }

    if (!sheetMeta) return
    const sheetId = sheetMeta.properties?.sheetId
    if (sheetId === undefined || sheetId === null) return
    const targetTitle = sheetMeta.properties?.title || config.sheetTitle

    const syncIdIndex = config.headers.indexOf('__SYNC_ID')

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${targetTitle}'!A1:Z`
    })

    const existingRows = res.data.values || []
    let rowIndex = -1

    for (let i = 1; i < existingRows.length; i++) {
      if (normalizeValue(existingRows[i][syncIdIndex]) === String(recordId)) {
        rowIndex = i
        break
      }
    }

    if (rowIndex === -1) return

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      }
    })

    console.log(`[Google Sheets Sync] ${targetTitle} row ${rowIndex + 1} physically deleted: ${recordId}`)
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

    const [itemsCount, incomingRows, outgoingRows, workersCount, prodCount, deptsCount] = await Promise.all([
      prisma.item.count(),
      prisma.incomingStock.findMany({ select: { pieces: true } }),
      prisma.outgoingStock.findMany({ select: { pieces: true } }),
      prisma.worker.count(),
      prisma.productionLog.count(),
      prisma.department.count()
    ])

    const totalIncomingPieces = incomingRows.reduce((acc, r) => acc + (r.pieces || 0), 0)
    const totalOutgoingPieces = outgoingRows.reduce((acc, r) => acc + (r.pieces || 0), 0)

    const summaryValues = [
      ['MIRA CREATION ERP'],
      ['Live Database Synchronization Mirror Dashboard'],
      [''],
      ['Last Successful Sync:', formatDateTime(new Date())],
      ['Sync Mode:', 'Real-time PostgreSQL Live Mirror'],
      [''],
      ['Metric', 'Value'],
      ['Total Items', itemsCount],
      ['Total Incoming Pieces', totalIncomingPieces],
      ['Total Outgoing Pieces', totalOutgoingPieces],
      ['Current Stock Balance (Pieces)', Math.max(0, totalIncomingPieces - totalOutgoingPieces)],
      ['Total Active Workers', workersCount],
      ['Total Production Logs', prodCount],
      ['Total Departments', deptsCount]
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

  try {
    const sheets = getSheetsClient()
    const spreadsheetId = parseSpreadsheetId()

    // 1. Fetch spreadsheet metadata & rename legacy tabs if present
    let spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    let existingSheets = spreadsheet.data.sheets || []

    const renameRequests: any[] = []
    existingSheets.forEach(s => {
      const title = s.properties?.title || ''
      const sheetId = s.properties?.sheetId
      if (sheetId !== undefined && sheetId !== null) {
        if (title === 'Workers') {
          renameRequests.push({
            updateSheetProperties: {
              properties: { sheetId, title: 'Worker Management' },
              fields: 'title'
            }
          })
        } else if (title === 'Production Logs') {
          renameRequests.push({
            updateSheetProperties: {
              properties: { sheetId, title: 'Worker Production' },
              fields: 'title'
            }
          })
        }
      }
    })

    if (renameRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: renameRequests }
      })
      spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
      existingSheets = spreadsheet.data.sheets || []
    }

    const existingSheetTitles = existingSheets.map(s => s.properties?.title || '')

    const requiredTabs = [
      'Dashboard Summary',
      'Item Master',
      'Incoming Stock',
      'Outgoing Stock',
      'Worker Production',
      'Worker Management',
      'Departments'
    ]

    const newSheetRequests: any[] = []
    requiredTabs.forEach(tab => {
      if (!existingSheetTitles.includes(tab)) {
        newSheetRequests.push({ addSheet: { properties: { title: tab } } })
      }
    })

    if (newSheetRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: newSheetRequests }
      })
      spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
      existingSheets = spreadsheet.data.sheets || []
    }

    // 2. Fetch fresh database state
    const [dbItems, dbIncoming, dbOutgoing, dbWorkers, dbProd, dbDepts] = await Promise.all([
      prisma.item.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.incomingStock.findMany({ orderBy: { date: 'desc' } }),
      prisma.outgoingStock.findMany({ orderBy: { date: 'desc' } }),
      prisma.worker.findMany({ orderBy: { name: 'asc' } }),
      prisma.productionLog.findMany({ orderBy: { date: 'desc' } }),
      prisma.department.findMany({ orderBy: { name: 'asc' } })
    ])

    const moduleDataMap: Record<string, any[]> = {
      item: dbItems,
      incomingStock: dbIncoming,
      outgoingStock: dbOutgoing,
      worker: dbWorkers,
      productionLog: dbProd,
      department: dbDepts
    }

    let globalRebuiltCount = 0

    // 3. Rebuild each managed worksheet cleanly
    for (const [moduleKey, config] of Object.entries(MODULE_CONFIGS)) {
      const dbRecords = moduleDataMap[moduleKey] || []
      globalRebuiltCount += dbRecords.length

      const sheetMeta = existingSheets.find(s => s.properties?.title === config.sheetTitle)
      const sheetId = sheetMeta?.properties?.sheetId
      if (sheetId === undefined || sheetId === null) continue

      const syncIdIndex = config.headers.indexOf('__SYNC_ID')

      // Clear obsolete data & headers
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${config.sheetTitle}'!A1:Z10000`
      })

      // Build data rows
      const dataRows: any[][] = dbRecords.map((rec, idx) => {
        const { recordId, rowValues } = config.mapper(rec, idx + 1)
        const row = new Array(config.headers.length).fill('-')
        for (let i = 0; i < rowValues.length; i++) {
          row[i] = rowValues[i]
        }
        row[syncIdIndex] = recordId
        return row
      })

      const allValues = [config.headers, ...dataRows]

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${config.sheetTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allValues }
      })

      // Apply Professional Formatting via BatchUpdate
      const formatRequests: any[] = [
        // Freeze Row 1
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        // Header Styling (Row 0)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: config.headers.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.12, green: 0.16, blue: 0.23 }, // #1E293B Dark Slate
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10, fontFamily: 'Arial' },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Hide __SYNC_ID Column
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: syncIdIndex, endIndex: syncIdIndex + 1 },
            properties: { hiddenByUser: true },
            fields: 'hiddenByUser'
          }
        }
      ]

      // Set explicit Column Pixel Widths
      config.headers.forEach((h, cIdx) => {
        const width = COLUMN_WIDTH_MAP[h] || 150
        formatRequests.push({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: cIdx, endIndex: cIdx + 1 },
            properties: { pixelSize: width },
            fields: 'pixelSize'
          }
        })
      })

      // Data Rows Formatting (Middle vertical align, currency/number formats, alignment)
      if (dataRows.length > 0) {
        config.headers.forEach((h, cIdx) => {
          if (h === '__SYNC_ID') return
          let hAlign = 'LEFT'
          let numberFormat: any = undefined

          if (h === 'PIECES' || h === 'SR NO' || h === 'WORKER ID' || h === 'DATE' || h === 'JOINING DATE') {
            hAlign = 'CENTER'
          }
          if (h === 'PIECES') {
            numberFormat = { type: 'NUMBER', pattern: '#,##0' }
          }
          if (h === 'RATE (₹)' || h === 'TOTAL (₹)') {
            hAlign = 'RIGHT'
            numberFormat = { type: 'CURRENCY', pattern: '"₹"#,##0.00' }
          }

          const cellFormat: any = {
            verticalAlignment: 'MIDDLE',
            horizontalAlignment: hAlign
          }
          if (numberFormat) {
            cellFormat.numberFormat = numberFormat
          }

          formatRequests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: dataRows.length + 1,
                startColumnIndex: cIdx,
                endColumnIndex: cIdx + 1
              },
              cell: { userEnteredFormat: cellFormat },
              fields: numberFormat
                ? 'userEnteredFormat(verticalAlignment,horizontalAlignment,numberFormat)'
                : 'userEnteredFormat(verticalAlignment,horizontalAlignment)'
            }
          })
        })

        // Apply grid filter
        formatRequests.push({
          setBasicFilter: {
            filter: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: dataRows.length + 1,
                startColumnIndex: 0,
                endColumnIndex: syncIdIndex
              }
            }
          }
        })
      }

      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: formatRequests }
        })
      } catch (fErr: any) {
        console.warn(`[Google Sheets Formatting Warning] ${config.sheetTitle}:`, fErr.message)
      }
    }

    await updateDashboardSummary()

    return {
      status: 'success',
      message: `Google Sheets full synchronization completed successfully. ${globalRebuiltCount} records aligned across all sheets.`,
      added: globalRebuiltCount,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      totalRecords: globalRebuiltCount,
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
      userMsg = `Permission Denied: Please open your Google Spreadsheet, click 'Share' in top-right, add '${saEmail}', and assign Editor permissions.`
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
