import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { searchFilter } from '../lib/query.js'
import ExcelJS from 'exceljs'
// @ts-expect-error - pdfkit doesn't have types
import PDFDocument from 'pdfkit'

const router = Router()

async function getIncomingRows(req: Request) {
  const search = req.query.search as string | undefined
  const where: any = searchFilter(search, ['srNo', 'design', 'fabric', 'supplier', 'notes'])
  return prisma.incomingStock.findMany({ where, orderBy: { date: 'desc' } })
}

async function getOutgoingRows(req: Request) {
  const search = req.query.search as string | undefined
  const where: any = searchFilter(search, ['srNo', 'design', 'fabric', 'customer', 'vehicleNumber', 'notes'])
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status
  return prisma.outgoingStock.findMany({ where, orderBy: { date: 'desc' } })
}

router.get('/incoming/csv', async (req: Request, res: Response) => {
  const rows = await getIncomingRows(req)
  const header = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total', 'Supplier', 'Notes']
  const lines = rows.map((r: any) => [r.date, r.srNo, r.design, r.fabric, r.pieces, r.rate, r.total, r.supplier || '', r.notes || ''].join(','))
  const csv = [header.join(','), ...lines].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="incoming-stock-${new Date().toISOString().split('T')[0]}.csv"`)
  res.send(csv)
})

router.get('/outgoing/csv', async (req: Request, res: Response) => {
  const rows = await getOutgoingRows(req)
  const header = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total', 'Customer', 'Dispatch Date', 'Vehicle', 'Status', 'Notes']
  const lines = rows.map((r: any) =>
    [r.date, r.srNo, r.design, r.fabric, r.pieces, r.rate, r.total, r.customer, r.dispatchDate, r.vehicleNumber, r.status, r.notes || ''].join(',')
  )
  const csv = [header.join(','), ...lines].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="outgoing-stock-${new Date().toISOString().split('T')[0]}.csv"`)
  res.send(csv)
})

router.get('/incoming/excel', async (req: Request, res: Response) => {
  const rows = await getIncomingRows(req)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Incoming Stock')
  ws.columns = [
    { header: 'Date', key: 'date' },
    { header: 'SR No', key: 'srNo' },
    { header: 'Design', key: 'design' },
    { header: 'Fabric', key: 'fabric' },
    { header: 'Pieces', key: 'pieces' },
    { header: 'Rate', key: 'rate' },
    { header: 'Total', key: 'total' },
    { header: 'Supplier', key: 'supplier' },
    { header: 'Notes', key: 'notes' },
  ]
  ws.addRows(rows.map((r: any) => ({ ...r, supplier: r.supplier || '', notes: r.notes || '' })))
  const buf = await wb.xlsx.writeBuffer()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="incoming-stock-${new Date().toISOString().split('T')[0]}.xlsx"`)
  res.send(Buffer.from(buf))
})

router.get('/outgoing/excel', async (req: Request, res: Response) => {
  const rows = await getOutgoingRows(req)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Outgoing Stock')
  ws.columns = [
    { header: 'Date', key: 'date' },
    { header: 'SR No', key: 'srNo' },
    { header: 'Design', key: 'design' },
    { header: 'Fabric', key: 'fabric' },
    { header: 'Pieces', key: 'pieces' },
    { header: 'Rate', key: 'rate' },
    { header: 'Total', key: 'total' },
    { header: 'Customer', key: 'customer' },
    { header: 'Dispatch Date', key: 'dispatchDate' },
    { header: 'Vehicle', key: 'vehicleNumber' },
    { header: 'Status', key: 'status' },
    { header: 'Notes', key: 'notes' },
  ]
  ws.addRows(rows.map((r: any) => ({ ...r, notes: r.notes || '' })))
  const buf = await wb.xlsx.writeBuffer()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="outgoing-stock-${new Date().toISOString().split('T')[0]}.xlsx"`)
  res.send(Buffer.from(buf))
})

router.get('/incoming/pdf', async (req: Request, res: Response) => {
  const rows = await getIncomingRows(req)
  const doc = new PDFDocument({ margin: 30, size: 'A4', landscape: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="incoming-stock-${new Date().toISOString().split('T')[0]}.pdf"`)
    res.send(Buffer.concat(chunks))
  })
  doc.fontSize(16).text('Mira Creation - Incoming Stock', { align: 'center' })
  doc.moveDown()
  const tableTop = doc.y
  const colWidths = [70, 80, 130, 110, 60, 60, 70, 120]
  const headers = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total', 'Supplier']
  let x = 30
  doc.fontSize(9).font('Helvetica-Bold')
  headers.forEach((h, i) => { doc.text(h, x, tableTop, { width: colWidths[i] }); x += colWidths[i] })
  doc.font('Helvetica')
  let y = tableTop + 16
  rows.forEach((r: any) => {
    if (y > 520) { doc.addPage(); y = 40 }
    x = 30
    const cells = [r.date, r.srNo, r.design, r.fabric, String(r.pieces), String(r.rate), String(r.total), r.supplier || '']
    cells.forEach((c: any, i: number) => { doc.text(String(c), x, y, { width: colWidths[i] }); x += colWidths[i] })
    y += 16
  })
  doc.end()
})

router.get('/outgoing/pdf', async (req: Request, res: Response) => {
  const rows = await getOutgoingRows(req)
  const doc = new PDFDocument({ margin: 30, size: 'A4', landscape: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="outgoing-stock-${new Date().toISOString().split('T')[0]}.pdf"`)
    res.send(Buffer.concat(chunks))
  })
  doc.fontSize(16).text('Mira Creation - Outgoing Stock', { align: 'center' })
  doc.moveDown()
  const tableTop = doc.y
  const colWidths = [70, 80, 120, 100, 60, 60, 70, 120, 90, 90, 70]
  const headers = ['Date', 'SR No', 'Design', 'Fabric', 'Pieces', 'Rate', 'Total', 'Customer', 'Dispatch', 'Vehicle', 'Status']
  let x = 30
  doc.fontSize(9).font('Helvetica-Bold')
  headers.forEach((h, i) => { doc.text(h, x, tableTop, { width: colWidths[i] }); x += colWidths[i] })
  doc.font('Helvetica')
  let y = tableTop + 16
  rows.forEach((r: any) => {
    if (y > 520) { doc.addPage(); y = 40 }
    x = 30
    const cells = [r.date, r.srNo, r.design, r.fabric, String(r.pieces), String(r.rate), String(r.total), r.customer, r.dispatchDate, r.vehicleNumber, r.status]
    cells.forEach((c: any, i: number) => { doc.text(String(c), x, y, { width: colWidths[i] }); x += colWidths[i] })
    y += 16
  })
  doc.end()
})

export default router