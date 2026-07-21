import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { searchFilter } from '../lib/query.js'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

const router = Router()

async function getIncomingRows(req: Request) {
  const search = req.query.search as string | undefined
  const fromDate = req.query.fromDate as string | undefined // 'YYYY-MM-DD'
  const toDate = req.query.toDate as string | undefined // 'YYYY-MM-DD'
  
  const searchObj = searchFilter(search, ['srNo', 'design', 'fabric', 'supplier', 'notes'])
  const where: any = searchObj ? { ...searchObj } : {}
  const allRows = await prisma.incomingStock.findMany({ where })

  let filtered = allRows
  if (fromDate || toDate) {
    filtered = allRows.filter((r: any) => {
      if (!r.date) return false
      const [d, m, y] = r.date.split('-').map(Number)
      const rDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (fromDate && rDateStr < fromDate) return false
      if (toDate && rDateStr > toDate) return false
      return true
    })
  }

  filtered.sort((a: any, b: any) => {
    const [da, ma, ya] = (a.date || '').split('-').map(Number)
    const [db, mb, yb] = (b.date || '').split('-').map(Number)
    const timeA = ya ? new Date(ya, ma - 1, da).getTime() : 0
    const timeB = yb ? new Date(yb, mb - 1, db).getTime() : 0
    return timeA - timeB
  })

  return filtered
}

async function getOutgoingRows(req: Request) {
  const search = req.query.search as string | undefined
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  
  const searchObj = searchFilter(search, ['srNo', 'design', 'fabric', 'customer', 'vehicleNumber', 'notes'])
  const where: any = searchObj ? { ...searchObj } : {}
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status

  const allRows = await prisma.outgoingStock.findMany({ where })

  let filtered = allRows
  if (fromDate || toDate) {
    filtered = allRows.filter((r: any) => {
      if (!r.date) return false
      const [d, m, y] = r.date.split('-').map(Number)
      const rDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (fromDate && rDateStr < fromDate) return false
      if (toDate && rDateStr > toDate) return false
      return true
    })
  }

  filtered.sort((a: any, b: any) => {
    const [da, ma, ya] = (a.date || '').split('-').map(Number)
    const [db, mb, yb] = (b.date || '').split('-').map(Number)
    const timeA = ya ? new Date(ya, ma - 1, da).getTime() : 0
    const timeB = yb ? new Date(yb, mb - 1, db).getTime() : 0
    return timeA - timeB
  })

  return filtered
}

router.get('/incoming/csv', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const rows = await getIncomingRows(req)
  
  const title = 'Mira Creation - Incoming Stock Report'
  const dateRange = `From Date: ${fromDate || 'N/A'},To Date: ${toDate || 'N/A'}`
  const header = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total', 'Supplier']
  const lines = rows.map((r: any) => [r.date, r.srNo || '', r.design || '', r.fabric, r.pieces, r.rate, r.total, r.supplier || ''].join(','))
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  const summary = [
    '',
    `Total Entries,${totalEntries}`,
    `Total Pieces,${totalPieces}`,
    `Grand Total,₹${grandTotal}`,
  ]
  
  const csv = [title, dateRange, '', header.join(','), ...lines, ...summary].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="incoming-stock-${new Date().toISOString().split('T')[0]}.csv"`)
  res.send(csv)
})

router.get('/outgoing/csv', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const rows = await getOutgoingRows(req)
  
  const title = 'Mira Creation - Outgoing Stock Report'
  const dateRange = `From Date: ${fromDate || 'N/A'},To Date: ${toDate || 'N/A'}`
  const header = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total']
  const lines = rows.map((r: any) =>
    [r.date, r.srNo || '', r.design || '', r.fabric, r.pieces, r.rate, r.total].join(',')
  )
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  const summary = [
    '',
    `Total Entries,${totalEntries}`,
    `Total Pieces,${totalPieces}`,
    `Grand Total,₹${grandTotal}`,
  ]
  
  const csv = [title, dateRange, '', header.join(','), ...lines, ...summary].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="outgoing-stock-${new Date().toISOString().split('T')[0]}.csv"`)
  res.send(csv)
})

router.get('/incoming/excel', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const rows = await getIncomingRows(req)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Incoming Stock')
  
  // Title
  ws.mergeCells('A1:H1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'Mira Creation - Incoming Stock Report'
  titleCell.font = { name: 'Arial', size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center' }
  
  // Date range
  ws.mergeCells('A2:H2')
  const dateCell = ws.getCell('A2')
  dateCell.value = `From Date: ${fromDate || 'N/A'}   To Date: ${toDate || 'N/A'}`
  dateCell.font = { name: 'Arial', size: 11, italic: true }
  dateCell.alignment = { horizontal: 'center' }
  
  // Header Row
  ws.getRow(4).values = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total', 'Supplier']
  ws.getRow(4).font = { name: 'Arial', size: 11, bold: true }
  
  ws.columns = [
    { key: 'date', width: 12 },
    { key: 'srNo', width: 12 },
    { key: 'design', width: 20 },
    { key: 'fabric', width: 15 },
    { key: 'pieces', width: 10 },
    { key: 'rate', width: 10 },
    { key: 'total', width: 12 },
    { key: 'supplier', width: 20 },
  ]
  
  // Add rows
  rows.forEach((r: any) => {
    ws.addRow({
      date: r.date,
      srNo: r.srNo || '',
      design: r.design || '',
      fabric: r.fabric,
      pieces: r.pieces,
      rate: r.rate,
      total: r.total,
      supplier: r.supplier || '',
    })
  })
  
  const startSummaryRow = rows.length + 6
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  ws.getCell(`A${startSummaryRow}`).value = 'Total Entries:'
  ws.getCell(`B${startSummaryRow}`).value = totalEntries
  ws.getCell(`A${startSummaryRow}`).font = { bold: true }
  
  ws.getCell(`A${startSummaryRow + 1}`).value = 'Total Pieces:'
  ws.getCell(`B${startSummaryRow + 1}`).value = totalPieces
  ws.getCell(`A${startSummaryRow + 1}`).font = { bold: true }
  
  ws.getCell(`A${startSummaryRow + 2}`).value = 'Grand Total:'
  ws.getCell(`B${startSummaryRow + 2}`).value = `₹${grandTotal}`
  ws.getCell(`A${startSummaryRow + 2}`).font = { bold: true }
  ws.getCell(`B${startSummaryRow + 2}`).font = { bold: true }
  
  const buf = await wb.xlsx.writeBuffer()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="incoming-stock-${new Date().toISOString().split('T')[0]}.xlsx"`)
  res.send(Buffer.from(buf))
})

router.get('/outgoing/excel', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const rows = await getOutgoingRows(req)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Outgoing Stock')
  
  // Title
  ws.mergeCells('A1:G1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'Mira Creation - Outgoing Stock Report'
  titleCell.font = { name: 'Arial', size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center' }
  
  // Date range
  ws.mergeCells('A2:G2')
  const dateCell = ws.getCell('A2')
  dateCell.value = `From Date: ${fromDate || 'N/A'}   To Date: ${toDate || 'N/A'}`
  dateCell.font = { name: 'Arial', size: 11, italic: true }
  dateCell.alignment = { horizontal: 'center' }
  
  // Header Row
  ws.getRow(4).values = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total']
  ws.getRow(4).font = { name: 'Arial', size: 11, bold: true }
  
  ws.columns = [
    { key: 'date', width: 12 },
    { key: 'srNo', width: 12 },
    { key: 'design', width: 20 },
    { key: 'fabric', width: 15 },
    { key: 'pieces', width: 10 },
    { key: 'rate', width: 10 },
    { key: 'total', width: 12 },
  ]
  
  // Add rows
  rows.forEach((r: any) => {
    ws.addRow({
      date: r.date,
      srNo: r.srNo || '',
      design: r.design || '',
      fabric: r.fabric,
      pieces: r.pieces,
      rate: r.rate,
      total: r.total,
    })
  })
  
  const startSummaryRow = rows.length + 6
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  ws.getCell(`A${startSummaryRow}`).value = 'Total Entries:'
  ws.getCell(`B${startSummaryRow}`).value = totalEntries
  ws.getCell(`A${startSummaryRow}`).font = { bold: true }
  
  ws.getCell(`A${startSummaryRow + 1}`).value = 'Total Pieces:'
  ws.getCell(`B${startSummaryRow + 1}`).value = totalPieces
  ws.getCell(`A${startSummaryRow + 1}`).font = { bold: true }
  
  ws.getCell(`A${startSummaryRow + 2}`).value = 'Grand Total:'
  ws.getCell(`B${startSummaryRow + 2}`).value = `Rs. ${grandTotal}`
  ws.getCell(`A${startSummaryRow + 2}`).font = { bold: true }
  ws.getCell(`B${startSummaryRow + 2}`).font = { bold: true }
  
  const buf = await wb.xlsx.writeBuffer()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="outgoing-stock-${new Date().toISOString().split('T')[0]}.xlsx"`)
  res.send(Buffer.from(buf))
})

router.get('/incoming/pdf', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const rows = await getIncomingRows(req)
  const doc = new PDFDocument({ margin: 30, size: [841.89, 595.28] })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="incoming-stock-${new Date().toISOString().split('T')[0]}.pdf"`)
    res.send(Buffer.concat(chunks))
  })
  
  const formatDisplayDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
  }

  // Title
  doc.fontSize(16).font('Helvetica-Bold').text('Mira Creation - Incoming Stock Report', { align: 'center' })
  doc.moveDown(0.2)
  doc.fontSize(10).font('Helvetica-Oblique').text(`From Date: ${formatDisplayDate(fromDate)}    To Date: ${formatDisplayDate(toDate)}`, { align: 'center' })
  doc.moveDown()
  
  const tableTop = doc.y
  const colWidths = [90, 100, 170, 150, 70, 70, 90]
  const headers = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total']
  let x = 40
  
  doc.fontSize(9).font('Helvetica-Bold')
  headers.forEach((h, i) => { doc.text(h, x, tableTop, { width: colWidths[i] }); x += colWidths[i] })
  
  doc.moveTo(40, tableTop + 12).lineTo(780, tableTop + 12).stroke()
  
  doc.font('Helvetica')
  let y = tableTop + 18
  rows.forEach((r: any) => {
    if (y > 500) { doc.addPage(); y = 40 }
    x = 40
    const cells = [r.date, r.srNo || '', r.design || '', r.fabric, String(r.pieces), String(r.rate), String(r.total)]
    cells.forEach((c: any, i: number) => { doc.text(String(c), x, y, { width: colWidths[i] }); x += colWidths[i] })
    y += 16
  })
  
  // Summary
  if (y > 450) { doc.addPage(); y = 40 }
  y += 10
  doc.moveTo(40, y).lineTo(780, y).stroke()
  y += 10
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  doc.fontSize(10).font('Helvetica-Bold')
  doc.text(`Total Entries: ${totalEntries}`, 40, y)
  y += 14
  doc.text(`Total Pieces: ${totalPieces}`, 40, y)
  y += 14
  doc.text(`Grand Total: Rs. ${grandTotal}`, 40, y)
  
  doc.end()
})

router.get('/outgoing/pdf', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const rows = await getOutgoingRows(req)
  const doc = new PDFDocument({ margin: 30, size: [841.89, 595.28] })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="outgoing-stock-${new Date().toISOString().split('T')[0]}.pdf"`)
    res.send(Buffer.concat(chunks))
  })
  
  const formatDisplayDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
  }

  // Title
  doc.fontSize(16).font('Helvetica-Bold').text('Mira Creation - Outgoing Stock Report', { align: 'center' })
  doc.moveDown(0.2)
  doc.fontSize(10).font('Helvetica-Oblique').text(`From Date: ${formatDisplayDate(fromDate)}    To Date: ${formatDisplayDate(toDate)}`, { align: 'center' })
  doc.moveDown()
  
  const tableTop = doc.y
  const colWidths = [90, 100, 170, 150, 70, 70, 90]
  const headers = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total']
  let x = 40
  doc.fontSize(9).font('Helvetica-Bold')
  headers.forEach((h, i) => { doc.text(h, x, tableTop, { width: colWidths[i] }); x += colWidths[i] })
  
  doc.moveTo(40, tableTop + 12).lineTo(780, tableTop + 12).stroke()
  
  doc.font('Helvetica')
  let y = tableTop + 16
  rows.forEach((r: any) => {
    if (y > 520) { doc.addPage(); y = 40 }
    x = 40
    const cells = [r.date, r.srNo || '', r.design || '', r.fabric, String(r.pieces), String(r.rate), String(r.total)]
    cells.forEach((c: any, i: number) => { doc.text(String(c), x, y, { width: colWidths[i] }); x += colWidths[i] })
    y += 16
  })

  // Summary
  if (y > 450) { doc.addPage(); y = 40 }
  y += 10
  doc.moveTo(40, y).lineTo(780, y).stroke()
  y += 10
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  doc.fontSize(10).font('Helvetica-Bold')
  doc.text(`Total Entries: ${totalEntries}`, 40, y)
  y += 14
  doc.text(`Total Pieces: ${totalPieces}`, 40, y)
  y += 14
  doc.text(`Grand Total: Rs. ${grandTotal}`, 40, y)

  doc.end()
})

async function getProductionRows(req: Request) {
  const search = req.query.search as string | undefined
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const workerId = req.query.workerId as string | undefined
  
  const searchObj = searchFilter(search, ['workerName', 'department', 'design', 'notes'])
  const where: any = searchObj ? { ...searchObj } : {}
  if (req.query.department && req.query.department !== 'all') where.department = req.query.department
  if (workerId && workerId !== 'all') where.workerId = workerId

  const allRows = await prisma.productionLog.findMany({ where })

  let filtered = allRows
  if (fromDate || toDate) {
    filtered = allRows.filter((r: any) => {
      if (!r.date) return false
      const [d, m, y] = r.date.split('-').map(Number)
      const rDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (fromDate && rDateStr < fromDate) return false
      if (toDate && rDateStr > toDate) return false
      return true
    })
  }

  filtered.sort((a: any, b: any) => {
    const [da, ma, ya] = (a.date || '').split('-').map(Number)
    const [db, mb, yb] = (b.date || '').split('-').map(Number)
    const timeA = ya ? new Date(ya, ma - 1, da).getTime() : 0
    const timeB = yb ? new Date(yb, mb - 1, db).getTime() : 0
    return timeA - timeB
  })

  return filtered
}

router.get('/production/csv', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const workerId = req.query.workerId as string | undefined
  const rows = await getProductionRows(req)
  
  let workerName = 'All Workers'
  if (workerId && workerId !== 'all') {
    const workerObj = await prisma.worker.findUnique({ where: { id: workerId } })
    if (workerObj) workerName = workerObj.name
  }
  
  const title = 'Mira Creation - Worker Production Report'
  const dateRange = `From Date: ${fromDate || 'N/A'},To Date: ${toDate || 'N/A'}`
  const workerLine = `Worker: ${workerName}`
  const header = ['Date', 'Worker Name', 'Department', 'Design', 'Pieces', 'Rate', 'Total']
  const lines = rows.map((r: any) =>
    [r.date, r.workerName || '', r.department || '', r.design || '', r.pieces, r.rate, r.total].join(',')
  )
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  const summary = [
    '',
    `Total Entries,${totalEntries}`,
    `Total Pieces,${totalPieces}`,
    `Grand Total,₹${grandTotal}`,
  ]
  
  const csv = [title, dateRange, workerLine, '', header.join(','), ...lines, ...summary].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="worker-production-${new Date().toISOString().split('T')[0]}.csv"`)
  res.send(csv)
})

router.get('/production/excel', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const workerId = req.query.workerId as string | undefined
  const rows = await getProductionRows(req)
  
  let workerName = 'All Workers'
  if (workerId && workerId !== 'all') {
    const workerObj = await prisma.worker.findUnique({ where: { id: workerId } })
    if (workerObj) workerName = workerObj.name
  }
  
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Worker Production')
  
  // Title
  ws.mergeCells('A1:G1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'Mira Creation - Worker Production Report'
  titleCell.font = { name: 'Arial', size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center' }
  
  // Date range & worker name
  ws.mergeCells('A2:G2')
  const dateCell = ws.getCell('A2')
  dateCell.value = `From Date: ${fromDate || 'N/A'}   To Date: ${toDate || 'N/A'}   Worker: ${workerName}`
  dateCell.font = { name: 'Arial', size: 11, italic: true }
  dateCell.alignment = { horizontal: 'center' }
  
  // Header Row
  ws.getRow(4).values = ['Date', 'Worker Name', 'Department', 'Design', 'Pieces', 'Rate', 'Total']
  ws.getRow(4).font = { name: 'Arial', size: 11, bold: true }
  
  ws.columns = [
    { key: 'date', width: 12 },
    { key: 'workerName', width: 18 },
    { key: 'department', width: 15 },
    { key: 'design', width: 18 },
    { key: 'pieces', width: 10 },
    { key: 'rate', width: 10 },
    { key: 'total', width: 12 },
  ]
  
  // Add rows
  rows.forEach((r: any) => {
    ws.addRow({
      date: r.date,
      workerName: r.workerName || '',
      department: r.department || '',
      design: r.design || '',
      pieces: r.pieces,
      rate: r.rate,
      total: r.total,
    })
  })
  
  const startSummaryRow = rows.length + 6
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  ws.getCell(`A${startSummaryRow}`).value = 'Total Entries:'
  ws.getCell(`B${startSummaryRow}`).value = totalEntries
  ws.getCell(`A${startSummaryRow}`).font = { bold: true }
  
  ws.getCell(`A${startSummaryRow + 1}`).value = 'Total Pieces:'
  ws.getCell(`B${startSummaryRow + 1}`).value = totalPieces
  ws.getCell(`A${startSummaryRow + 1}`).font = { bold: true }
  
  ws.getCell(`A${startSummaryRow + 2}`).value = 'Grand Total:'
  ws.getCell(`B${startSummaryRow + 2}`).value = `Rs. ${grandTotal}`
  ws.getCell(`A${startSummaryRow + 2}`).font = { bold: true }
  ws.getCell(`B${startSummaryRow + 2}`).font = { bold: true }
  
  const buf = await wb.xlsx.writeBuffer()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="worker-production-${new Date().toISOString().split('T')[0]}.xlsx"`)
  res.send(Buffer.from(buf))
})

router.get('/production/pdf', async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const workerId = req.query.workerId as string | undefined
  const rows = await getProductionRows(req)
  const doc = new PDFDocument({ margin: 30, size: [841.89, 595.28] })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="worker-production-${new Date().toISOString().split('T')[0]}.pdf"`)
    res.send(Buffer.concat(chunks))
  })
  
  const formatDisplayDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
  }
  
  let workerName = 'All Workers'
  if (workerId && workerId !== 'all') {
    const workerObj = await prisma.worker.findUnique({ where: { id: workerId } })
    if (workerObj) workerName = workerObj.name
  }

  // Title
  doc.fontSize(16).font('Helvetica-Bold').text('Mira Creation - Worker Production Report', { align: 'center' })
  doc.moveDown(0.2)
  doc.fontSize(10).font('Helvetica-Oblique').text(`From Date: ${formatDisplayDate(fromDate)}    To Date: ${formatDisplayDate(toDate)}    Worker: ${workerName}`, { align: 'center' })
  doc.moveDown()
  
  const tableTop = doc.y
  const colWidths = [90, 150, 130, 120, 80, 80, 90]
  const headers = ['Date', 'Worker Name', 'Department', 'Design', 'Pieces', 'Rate', 'Total']
  let x = 40
  
  doc.fontSize(9).font('Helvetica-Bold')
  headers.forEach((h, i) => { doc.text(h, x, tableTop, { width: colWidths[i] }); x += colWidths[i] })
  
  doc.moveTo(40, tableTop + 12).lineTo(780, tableTop + 12).stroke()
  
  doc.font('Helvetica')
  let y = tableTop + 18
  rows.forEach((r: any) => {
    if (y > 500) { doc.addPage(); y = 40 }
    x = 40
    const cells = [r.date, r.workerName || '', r.department || '', r.design || '', String(r.pieces), String(r.rate), String(r.total)]
    cells.forEach((c: any, i: number) => { doc.text(String(c), x, y, { width: colWidths[i] }); x += colWidths[i] })
    y += 16
  })
  
  // Summary
  if (y > 450) { doc.addPage(); y = 40 }
  y += 10
  doc.moveTo(40, y).lineTo(780, y).stroke()
  y += 10
  
  const totalEntries = rows.length
  const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
  
  doc.fontSize(10).font('Helvetica-Bold')
  doc.text(`Total Entries: ${totalEntries}`, 40, y)
  y += 14
  doc.text(`Total Pieces: ${totalPieces}`, 40, y)
  y += 14
  doc.text(`Grand Total: Rs. ${grandTotal}`, 40, y)
  
  doc.end()
})

async function getItemRows(req: Request) {
  const itemCode = req.query.itemCode as string | undefined
  const itemName = req.query.itemName as string | undefined
  const fabricName = req.query.fabricName as string | undefined
  const search = req.query.search as string | undefined
  const status = req.query.status as string | undefined

  const where: any = {}
  if (search) {
    where.OR = [
      { itemCode: { contains: search, mode: 'insensitive' } },
      { itemName: { contains: search, mode: 'insensitive' } },
      { fabricName: { contains: search, mode: 'insensitive' } },
    ]
  } else {
    if (itemCode) {
      where.itemCode = { contains: itemCode, mode: 'insensitive' }
    }
    if (itemName) {
      where.itemName = { contains: itemName, mode: 'insensitive' }
    }
    if (fabricName) {
      where.fabricName = { contains: fabricName, mode: 'insensitive' }
    }
  }
  if (status && status !== 'all') {
    where.status = status
  }

  const allRows = await prisma.item.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  return allRows
}

// Helper function to fetch local or remote file as buffer
async function getFileBuffer(urlPath: string): Promise<any> {
  try {
    if (urlPath.startsWith('http')) {
      const res = await fetch(urlPath)
      if (!res.ok) return null
      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } else {
      const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath
      const filePath = path.join(process.cwd(), cleanPath)
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath)
      }
    }
  } catch (err) {
    console.error('Failed to get file buffer for Excel:', urlPath, err)
  }
  return null
}

router.get('/items/excel', async (req: Request, res: Response) => {
  try {
    const rows = await getItemRows(req)
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Item Master')

    // Title
    ws.mergeCells('A1:H1')
    const titleCell = ws.getCell('A1')
    titleCell.value = 'Mira Creation - Item Master Report'
    titleCell.font = { name: 'Arial', size: 16, bold: true }
    titleCell.alignment = { horizontal: 'center' }

    // Header Row
    ws.getRow(3).values = ['Sr No', 'Image', 'Item Code', 'Item Name', 'Fabric Name', 'Remark', 'Status', 'Created At']
    ws.getRow(3).font = { name: 'Arial', size: 11, bold: true }
    ws.getRow(3).height = 24

    ws.columns = [
      { key: 'srNo', width: 8 },
      { key: 'image', width: 14 },
      { key: 'itemCode', width: 15 },
      { key: 'itemName', width: 25 },
      { key: 'fabricName', width: 20 },
      { key: 'remark', width: 30 },
      { key: 'status', width: 12 },
      { key: 'createdAt', width: 20 },
    ]

    // Add rows and images asynchronously
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]
      const rowNum = idx + 4
      const row = ws.addRow({
        srNo: idx + 1,
        image: '',
        itemCode: r.itemCode,
        itemName: r.itemName || '',
        fabricName: r.fabricName,
        remark: r.remark || '',
        status: r.status,
        createdAt: r.createdAt.toISOString().split('T')[0]
      })
      row.height = 48
      row.alignment = { vertical: 'middle', horizontal: 'left' }

      if (r.itemImage) {
        const imageBuffer = await getFileBuffer(r.itemImage)
        if (imageBuffer) {
          try {
            let ext: 'png' | 'jpeg' = 'jpeg'
            if (r.itemImage.toLowerCase().endsWith('.png')) {
              ext = 'png'
            } else if (r.itemImage.toLowerCase().endsWith('.gif')) {
              // Gif not supported directly by addImage as png/jpeg, fallback to jpeg is okay
            }
            const imageId = wb.addImage({
              buffer: imageBuffer,
              extension: ext
            })
            ws.addImage(imageId, {
              tl: { col: 1.15, row: rowNum - 0.9 },
              ext: { width: 52, height: 52 }
            })
          } catch (e) {
            console.error('Failed to embed image in worksheet row:', rowNum, e)
          }
        }
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="item-master-${new Date().toISOString().split('T')[0]}.xlsx"`)
    
    await wb.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('Failed to export items to Excel:', err)
    res.status(500).json({ error: 'Export failed' })
  }
})

export default router