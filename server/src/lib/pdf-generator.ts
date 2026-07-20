import PDFDocument from 'pdfkit'

export interface BackupPdfData {
  generatedAt: Date
  summary: {
    users: number
    items: number
    incoming: number
    outgoing: number
    workers: number
    production: number
    departments: number
    settings: number
    auditLogs: number
  }
  users: any[]
  items: any[]
  incoming: any[]
  outgoing: any[]
  workers: any[]
  production: any[]
  departments: any[]
  settings: any[]
  auditLogs: any[]
}

export interface BackupHistoryLogEntry {
  date: string
  status: string
  totalRecords: number
  tablesCount: number
  itemsCount: number
  incomingCount: number
  outgoingCount: number
  workersCount: number
  usersCount: number
  filesCount: number
  jsonSizeBytes?: number
  durationMs?: number
}

function formatDate(val: any): string {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(val)
  }
}

function formatCurrency(num: any): string {
  const n = Number(num) || 0
  return `Rs. ${n.toLocaleString('en-IN')}`
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function generateBackupReportPdf(data: BackupPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 35, size: 'A4', bufferPages: true })
      const buffers: Buffer[] = []

      doc.on('data', (chunk: any) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err: any) => reject(err))

      const pageWidth = doc.page.width - 70 // 525.28 pt printable area

      // 1. Header Banner
      doc
        .rect(35, 35, pageWidth, 55)
        .fill('#0f172a') // Slate-900

      doc
        .fillColor('#ffffff')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('MIRA CREATION ERP', 48, 47)

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text('Complete Database Backup Report', 48, 68)

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#38bdf8')
        .text(`Backup Date: ${data.generatedAt.toLocaleString('en-IN')}`, 320, 58, { align: 'right', width: pageWidth - 295 })

      doc.y = 105

      // 2. Executive Summary Cards Grid
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text('Executive System Summary', 35, doc.y)

      doc.moveDown(0.4)

      const summaryGrid = [
        { label: 'Total Users', count: data.summary.users, color: '#0284c7' },
        { label: 'Item Master', count: data.summary.items, color: '#0d9488' },
        { label: 'Incoming Batches', count: data.summary.incoming, color: '#16a34a' },
        { label: 'Outgoing Batches', count: data.summary.outgoing, color: '#d97706' },
        { label: 'Workers', count: data.summary.workers, color: '#9333ea' },
        { label: 'Production Logs', count: data.summary.production, color: '#4f46e5' },
      ]

      const cardWidth = (pageWidth - 20) / 3
      const cardHeight = 36
      let startX = 35
      let startY = doc.y

      summaryGrid.forEach((item, idx) => {
        const col = idx % 3
        const row = Math.floor(idx / 3)
        const x = startX + col * (cardWidth + 10)
        const y = startY + row * (cardHeight + 8)

        doc.rect(x, y, cardWidth, cardHeight).fillAndStroke('#f8fafc', '#e2e8f0')

        doc
          .fillColor('#64748b')
          .fontSize(8)
          .font('Helvetica')
          .text(item.label, x + 8, y + 6)

        doc
          .fillColor(item.color)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(String(item.count), x + 8, y + 18)
      })

      doc.y = startY + 2 * (cardHeight + 8) + 15

      // Helper function to render data tables
      const renderSectionTable = (
        title: string,
        headers: string[],
        rows: string[][],
        colWidths: number[]
      ) => {
        if (doc.y > 680) doc.addPage()

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(title, 35, doc.y)

        doc.moveDown(0.3)

        let currentY = doc.y
        const headerHeight = 20
        const rowHeight = 18

        doc.rect(35, currentY, pageWidth, headerHeight).fill('#1e293b')

        let currentX = 35
        headers.forEach((h, i) => {
          doc
            .fillColor('#ffffff')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(h, currentX + 4, currentY + 5, { width: colWidths[i] - 8, lineBreak: false, ellipsis: '...' })
          currentX += colWidths[i]
        })

        currentY += headerHeight

        if (rows.length === 0) {
          doc.rect(35, currentY, pageWidth, rowHeight).fillAndStroke('#ffffff', '#e2e8f0')
          doc
            .fillColor('#94a3b8')
            .fontSize(8)
            .font('Helvetica-Oblique')
            .text('No records found in this table.', 40, currentY + 5)
          currentY += rowHeight
        } else {
          rows.forEach((r, rowIdx) => {
            if (currentY > 740) {
              doc.addPage()
              currentY = 40
              doc.rect(35, currentY, pageWidth, headerHeight).fill('#1e293b')
              let hX = 35
              headers.forEach((h, i) => {
                doc
                  .fillColor('#ffffff')
                  .fontSize(8)
                  .font('Helvetica-Bold')
                  .text(h, hX + 4, currentY + 5, { width: colWidths[i] - 8, lineBreak: false, ellipsis: '...' })
                hX += colWidths[i]
              })
              currentY += headerHeight
            }

            const bg = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc'
            doc.rect(35, currentY, pageWidth, rowHeight).fillAndStroke(bg, '#f1f5f9')

            let cellX = 35
            r.forEach((cell, cellIdx) => {
              doc
                .fillColor('#334155')
                .fontSize(8)
                .font('Helvetica')
                .text(String(cell || '-'), cellX + 4, currentY + 4, {
                  width: colWidths[cellIdx] - 8,
                  height: rowHeight - 4,
                  lineBreak: false,
                  ellipsis: '...'
                })
              cellX += colWidths[cellIdx]
            })

            currentY += rowHeight
          })
        }

        doc.y = currentY + 15
      }

      // Section 1: Users
      renderSectionTable(
        '1. System Users',
        ['Name', 'Email', 'Role', 'Status', 'Created Date'],
        data.users.map((u) => [u.name, u.email, u.role, u.resetToken ? 'Pending' : 'Active', formatDate(u.createdAt)]),
        [110, 165, 75, 75, 100]
      )

      // Section 2: Item Master
      renderSectionTable(
        '2. Item Master Inventory',
        ['Item Code', 'Item Name', 'Fabric Name', 'Status', 'Created Date'],
        data.items.map((i) => [
          i.itemCode || '-',
          i.itemName || '-',
          i.fabricName || '-',
          i.status || 'Active',
          formatDate(i.createdAt)
        ]),
        [100, 140, 130, 75, 80]
      )

      // Section 3: Incoming Stock
      renderSectionTable(
        '3. Incoming Stock Records',
        ['Sr / Batch', 'Date', 'Fabric / Item', 'Supplier', 'Pieces', 'Rate', 'Total Cost'],
        data.incoming.map((inc) => [
          inc.srNo || (inc.id ? inc.id.slice(0, 8) : '-'),
          formatDate(inc.date),
          inc.fabric || inc.design || inc.item?.itemName || inc.item?.fabricName || '-',
          inc.supplier || '-',
          String(inc.pieces ?? 0),
          formatCurrency(inc.rate),
          formatCurrency(inc.total)
        ]),
        [75, 75, 120, 95, 50, 55, 55]
      )

      // Section 4: Outgoing Stock
      renderSectionTable(
        '4. Outgoing Stock Records',
        ['Sr / Challan', 'Date', 'Fabric / Item', 'Customer', 'Pieces', 'Rate', 'Total Amount'],
        data.outgoing.map((out) => [
          out.srNo || (out.id ? out.id.slice(0, 8) : '-'),
          formatDate(out.date),
          out.fabric || out.design || out.item?.itemName || out.item?.fabricName || '-',
          out.customer || '-',
          String(out.pieces ?? 0),
          formatCurrency(out.rate),
          formatCurrency(out.total)
        ]),
        [75, 75, 120, 95, 50, 55, 55]
      )

      // Section 5: Workers
      renderSectionTable(
        '5. Workers & Workforce',
        ['Worker ID', 'Worker Name', 'Department', 'Phone', 'Salary', 'Status'],
        data.workers.map((w) => [
          w.workerId || '-',
          w.name || '-',
          w.department || 'General',
          w.phone || '-',
          formatCurrency(w.salary),
          w.status || 'Active'
        ]),
        [80, 120, 110, 85, 65, 65]
      )

      // Section 6: Production Logs
      renderSectionTable(
        '6. Production Logs',
        ['Log Date', 'Department', 'Worker', 'Design', 'Pieces', 'Total Rate', 'Status'],
        data.production.map((p) => [
          formatDate(p.date),
          p.department || '-',
          p.workerName || p.worker?.name || '-',
          p.design || '-',
          String(p.pieces ?? 0),
          formatCurrency(p.total),
          p.status || 'Completed'
        ]),
        [75, 85, 105, 100, 45, 60, 55]
      )

      // Section 7: Departments
      renderSectionTable(
        '7. Departments',
        ['Department Name', 'Description', 'Created At'],
        data.departments.map((d) => [d.name, d.description || '-', formatDate(d.createdAt)]),
        [150, 245, 130]
      )

      // Section 8: Settings
      renderSectionTable(
        '8. Company Settings & Configuration',
        ['Setting Field', 'Value'],
        data.settings.map((s) => [
          s.companyName ? 'Company Profile' : (s.key || 'Settings'),
          s.companyName ? `${s.companyName} (${s.gstin || s.gstNumber || 'No GST'})` : String(s.value || '-')
        ]),
        [175, 350]
      )

      // Footer on all pages
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#94a3b8')
          .text(
            `Mira Creation ERP — Confidential System Backup Report | Page ${i + 1} of ${totalPages}`,
            35,
            doc.page.height - 25,
            { align: 'center', width: pageWidth }
          )
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

export function generateBackupHistoryPdf(historyLogs: BackupHistoryLogEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 35, size: 'A4', bufferPages: true })
      const buffers: Buffer[] = []

      doc.on('data', (chunk: any) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err: any) => reject(err))

      const pageWidth = doc.page.width - 70

      // Header Banner
      doc.rect(35, 35, pageWidth, 55).fill('#0f172a')

      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('MIRA CREATION ERP', 48, 47)
      doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('Backup Execution History Report (Backup_History.pdf)', 48, 68)

      const latestRun = historyLogs[0] ? new Date(historyLogs[0].date).toLocaleString('en-IN') : 'N/A'
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#38bdf8').text(`Last Updated: ${latestRun}`, 300, 58, { align: 'right', width: pageWidth - 275 })

      doc.y = 105

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Continuous Backup Audit Log Trail', 35, doc.y)
      doc.moveDown(0.4)

      let currentY = doc.y
      const headerHeight = 22
      const rowHeight = 20

      const headers = ['Date & Time', 'Status', 'DB Records', 'Items', 'Incoming', 'Outgoing', 'Workers', 'Files', 'Size', 'Duration']
      const colWidths = [105, 55, 50, 35, 45, 45, 45, 35, 50, 60]

      // Table Header
      doc.rect(35, currentY, pageWidth, headerHeight).fill('#1e293b')
      let hX = 35
      headers.forEach((h, i) => {
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text(h, hX + 2, currentY + 6, { width: colWidths[i] - 4, lineBreak: false, ellipsis: '...' })
        hX += colWidths[i]
      })
      currentY += headerHeight

      if (!historyLogs || historyLogs.length === 0) {
        doc.rect(35, currentY, pageWidth, rowHeight).fillAndStroke('#ffffff', '#e2e8f0')
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text('No backup history entries recorded yet.', 40, currentY + 5)
      } else {
        historyLogs.forEach((log, idx) => {
          if (currentY > 740) {
            doc.addPage()
            currentY = 40
            doc.rect(35, currentY, pageWidth, headerHeight).fill('#1e293b')
            let curH = 35
            headers.forEach((h, i) => {
              doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text(h, curH + 2, currentY + 6, { width: colWidths[i] - 4, lineBreak: false, ellipsis: '...' })
              curH += colWidths[i]
            })
            currentY += headerHeight
          }

          const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
          doc.rect(35, currentY, pageWidth, rowHeight).fillAndStroke(bg, '#f1f5f9')

          const dStr = new Date(log.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
          const durSec = log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'

          const rowVals = [
            dStr,
            log.status || 'Successful',
            String(log.totalRecords ?? 0),
            String(log.itemsCount ?? 0),
            String(log.incomingCount ?? 0),
            String(log.outgoingCount ?? 0),
            String(log.workersCount ?? 0),
            String(log.filesCount ?? 0),
            formatBytes(log.jsonSizeBytes),
            durSec
          ]

          let cX = 35
          rowVals.forEach((val, cIdx) => {
            const isStatus = cIdx === 1
            const color = isStatus ? (val === 'Successful' ? '#16a34a' : '#dc2626') : '#334155'
            const font = isStatus ? 'Helvetica-Bold' : 'Helvetica'
            doc.fillColor(color).fontSize(7.5).font(font).text(val, cX + 2, currentY + 5, { width: colWidths[cIdx] - 4, lineBreak: false, ellipsis: '...' })
            cX += colWidths[cIdx]
          })

          currentY += rowHeight
        })
      }

      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#94a3b8')
          .text(`Mira Creation ERP — Backup_History.pdf Audit Log | Page ${i + 1} of ${totalPages}`, 35, doc.page.height - 25, { align: 'center', width: pageWidth })
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
