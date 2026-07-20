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

export function generateBackupReportPdf(data: BackupPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 35, size: 'A4', bufferPages: true })
      const buffers: Buffer[] = []

      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err) => reject(err))

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
        // Ensure space for table header
        if (doc.y > 680) doc.addPage()

        // Section Title
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(title, 35, doc.y)

        doc.moveDown(0.3)

        let currentY = doc.y
        const headerHeight = 20
        const rowHeight = 18

        // Draw Table Header
        doc.rect(35, currentY, pageWidth, headerHeight).fill('#1e293b')

        let currentX = 35
        headers.forEach((h, i) => {
          doc
            .fillColor('#ffffff')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(h, currentX + 4, currentY + 5, { width: colWidths[i] - 8, truncate: '...' })
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
              // Redraw Header
              doc.rect(35, currentY, pageWidth, headerHeight).fill('#1e293b')
              let hX = 35
              headers.forEach((h, i) => {
                doc
                  .fillColor('#ffffff')
                  .fontSize(8)
                  .font('Helvetica-Bold')
                  .text(h, hX + 4, currentY + 5, { width: colWidths[i] - 8, truncate: '...' })
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
                  truncate: '...'
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
        data.users.map((u) => [u.name, u.email, u.role, u.active ? 'Active' : 'Inactive', formatDate(u.createdAt)]),
        [110, 165, 75, 75, 100]
      )

      // Section 2: Item Master
      renderSectionTable(
        '2. Item Master Inventory',
        ['Item Code', 'Item Name', 'Category', 'Unit', 'Stock Qty', 'Price'],
        data.items.map((i) => [i.itemCode, i.name, i.category || 'General', i.unit || 'PCS', String(i.stockQty ?? 0), formatCurrency(i.price)]),
        [90, 150, 95, 50, 60, 80]
      )

      // Section 3: Incoming Stock
      renderSectionTable(
        '3. Incoming Stock Records',
        ['Batch No', 'Date', 'Item Name', 'Supplier', 'Quantity', 'Price/Unit', 'Total Cost'],
        data.incoming.map((inc) => [
          inc.batchNo || '-',
          formatDate(inc.date),
          inc.itemName || inc.item?.name || '-',
          inc.supplier || '-',
          String(inc.quantity ?? 0),
          formatCurrency(inc.pricePerUnit),
          formatCurrency(inc.totalPrice)
        ]),
        [75, 75, 120, 95, 50, 55, 55]
      )

      // Section 4: Outgoing Stock
      renderSectionTable(
        '4. Outgoing Stock Records',
        ['Challan No', 'Date', 'Item Name', 'Customer', 'Quantity', 'Price/Unit', 'Total Amount'],
        data.outgoing.map((out) => [
          out.challanNo || '-',
          formatDate(out.date),
          out.itemName || out.item?.name || '-',
          out.customer || '-',
          String(out.quantity ?? 0),
          formatCurrency(out.pricePerUnit),
          formatCurrency(out.totalPrice)
        ]),
        [75, 75, 120, 95, 50, 55, 55]
      )

      // Section 5: Workers
      renderSectionTable(
        '5. Workers & Workforce',
        ['Worker Name', 'Department', 'Phone', 'Daily Wage', 'Status'],
        data.workers.map((w) => [
          w.name,
          w.department?.name || w.departmentName || 'General',
          w.phone || '-',
          formatCurrency(w.dailyWage),
          w.status || 'Active'
        ]),
        [125, 125, 105, 85, 85]
      )

      // Section 6: Production Logs
      renderSectionTable(
        '6. Production Logs',
        ['Log Date', 'Department', 'Worker', 'Item', 'Qty Completed', 'Status'],
        data.production.map((p) => [
          formatDate(p.date),
          p.department?.name || p.departmentName || '-',
          p.worker?.name || p.workerName || '-',
          p.item?.name || p.itemName || '-',
          String(p.quantity ?? 0),
          p.status || 'Completed'
        ]),
        [75, 95, 105, 115, 65, 70]
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
        data.settings.map((s) => [s.key || s.name || 'Company Profile', s.value ? JSON.stringify(s.value) : `${s.companyName || ''} (${s.gstNumber || 'No GST'})`]),
        [175, 350]
      )

      // Add Footer on all pages
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
