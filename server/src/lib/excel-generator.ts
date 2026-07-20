import ExcelJS from 'exceljs'

export interface ExcelBackupData {
  generatedAt: Date
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

export async function generateERPExcelReport(data: ExcelBackupData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Mira Creation ERP'
  workbook.lastModifiedBy = 'Mira Creation ERP System'
  workbook.created = data.generatedAt
  workbook.modified = data.generatedAt

  // Helper to style sheet headers
  const applyHeaderStyle = (sheet: ExcelJS.Worksheet, headerRowIndex: number = 1) => {
    const row = sheet.getRow(headerRowIndex)
    row.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } }
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' } // Dark slate header
    }
    row.alignment = { vertical: 'middle', horizontal: 'center' }
    row.height = 24

    sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }]
  }

  const autoFitColumns = (sheet: ExcelJS.Worksheet) => {
    sheet.columns.forEach((column) => {
      let maxLen = 12
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : ''
        if (valStr.length > maxLen) {
          maxLen = Math.min(valStr.length, 45)
        }
      })
      column.width = maxLen + 4
    })
  }

  // 1. Sheet 1: Dashboard Summary
  const summarySheet = workbook.addWorksheet('Dashboard Summary')
  
  summarySheet.mergeCells('A1:D1')
  const titleCell = summarySheet.getCell('A1')
  titleCell.value = 'MIRA CREATION ERP'
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: '0F172A' } }

  summarySheet.mergeCells('A2:D2')
  const subCell = summarySheet.getCell('A2')
  subCell.value = 'Automatic Google Drive Backup Report'
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: '64748B' } }

  summarySheet.getCell('A4').value = 'Last Backup Time:'
  summarySheet.getCell('A4').font = { bold: true }
  summarySheet.getCell('B4').value = formatDateTime(data.generatedAt)

  summarySheet.getCell('A5').value = 'Backup Status:'
  summarySheet.getCell('A5').font = { bold: true }
  summarySheet.getCell('B5').value = 'Successful'
  summarySheet.getCell('B5').font = { bold: true, color: { argb: '16A34A' } }

  // Summary Metrics Table
  summarySheet.getCell('A7').value = 'System Metric'
  summarySheet.getCell('B7').value = 'Value'
  const metricHeaderRow = summarySheet.getRow(7)
  metricHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } }
  metricHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } }

  const totalIncomingPieces = data.incoming.reduce((sum, i) => sum + (Number(i.pieces) || 0), 0)
  const totalIncomingValue = data.incoming.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
  const totalOutgoingPieces = data.outgoing.reduce((sum, i) => sum + (Number(i.pieces) || 0), 0)
  const totalOutgoingValue = data.outgoing.reduce((sum, i) => sum + (Number(i.total) || 0), 0)

  const metrics = [
    ['Total System Users', data.users.length],
    ['Total Item Master Records', data.items.length],
    ['Total Incoming Batches', data.incoming.length],
    ['Total Incoming Pieces', totalIncomingPieces],
    ['Total Incoming Value (₹)', `₹ ${totalIncomingValue.toLocaleString('en-IN')}`],
    ['Total Outgoing Batches', data.outgoing.length],
    ['Total Outgoing Pieces', totalOutgoingPieces],
    ['Total Outgoing Value (₹)', `₹ ${totalOutgoingValue.toLocaleString('en-IN')}`],
    ['Total Workers', data.workers.length],
    ['Total Production Logs', data.production.length],
    ['Total Departments', data.departments.length],
  ]

  metrics.forEach((m, idx) => {
    const row = summarySheet.getRow(8 + idx)
    row.getCell(1).value = m[0]
    row.getCell(2).value = m[1]
    row.getCell(2).alignment = { horizontal: 'right' }
    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } }
    }
  })

  autoFitColumns(summarySheet)

  // 2. Sheet 2: Item Master
  const itemSheet = workbook.addWorksheet('Item Master')
  itemSheet.columns = [
    { header: 'Item Code', key: 'itemCode' },
    { header: 'Item Name', key: 'itemName' },
    { header: 'Fabric Name', key: 'fabricName' },
    { header: 'Status', key: 'status' },
    { header: 'Image URL', key: 'imageLink' },
    { header: 'Created Date', key: 'createdDate' },
  ]
  data.items.forEach((item) => {
    itemSheet.addRow({
      itemCode: item.itemCode || '-',
      itemName: item.itemName || '-',
      fabricName: item.fabricName || '-',
      status: item.status || 'Active',
      imageLink: item.itemImage ? { text: 'View Image', hyperlink: item.itemImage } : '-',
      createdDate: formatDate(item.createdAt),
    })
  })
  applyHeaderStyle(itemSheet)
  itemSheet.autoFilter = 'A1:F1'
  autoFitColumns(itemSheet)

  // 3. Sheet 3: Incoming Stock
  const incSheet = workbook.addWorksheet('Incoming Stock')
  incSheet.columns = [
    { header: 'Sr / Batch No', key: 'srNo' },
    { header: 'Date', key: 'date' },
    { header: 'Fabric / Item', key: 'fabric' },
    { header: 'Supplier', key: 'supplier' },
    { header: 'Pieces', key: 'pieces' },
    { header: 'Rate (₹)', key: 'rate' },
    { header: 'Total Cost (₹)', key: 'total' },
    { header: 'Notes', key: 'notes' },
  ]
  data.incoming.forEach((inc) => {
    incSheet.addRow({
      srNo: inc.srNo || inc.id?.slice(0, 8) || '-',
      date: formatDate(inc.date),
      fabric: inc.fabric || inc.design || inc.item?.itemName || inc.item?.fabricName || '-',
      supplier: inc.supplier || '-',
      pieces: Number(inc.pieces) || 0,
      rate: Number(inc.rate) || 0,
      total: Number(inc.total) || 0,
      notes: inc.notes || '-',
    })
  })
  applyHeaderStyle(incSheet)
  incSheet.autoFilter = 'A1:H1'
  autoFitColumns(incSheet)

  // 4. Sheet 4: Outgoing Stock
  const outSheet = workbook.addWorksheet('Outgoing Stock')
  outSheet.columns = [
    { header: 'Sr / Challan No', key: 'srNo' },
    { header: 'Date', key: 'date' },
    { header: 'Fabric / Item', key: 'fabric' },
    { header: 'Customer', key: 'customer' },
    { header: 'Pieces', key: 'pieces' },
    { header: 'Rate (₹)', key: 'rate' },
    { header: 'Total Amount (₹)', key: 'total' },
    { header: 'Dispatch Date', key: 'dispatchDate' },
    { header: 'Vehicle Number', key: 'vehicleNumber' },
    { header: 'Status', key: 'status' },
  ]
  data.outgoing.forEach((out) => {
    outSheet.addRow({
      srNo: out.srNo || out.id?.slice(0, 8) || '-',
      date: formatDate(out.date),
      fabric: out.fabric || out.design || out.item?.itemName || out.item?.fabricName || '-',
      customer: out.customer || '-',
      pieces: Number(out.pieces) || 0,
      rate: Number(out.rate) || 0,
      total: Number(out.total) || 0,
      dispatchDate: formatDate(out.dispatchDate),
      vehicleNumber: out.vehicleNumber || '-',
      status: out.status || 'Pending',
    })
  })
  applyHeaderStyle(outSheet)
  outSheet.autoFilter = 'A1:J1'
  autoFitColumns(outSheet)

  // 5. Sheet 5: Workers
  const workerSheet = workbook.addWorksheet('Workers')
  workerSheet.columns = [
    { header: 'Worker ID', key: 'workerId' },
    { header: 'Name', key: 'name' },
    { header: 'Department', key: 'department' },
    { header: 'Phone', key: 'phone' },
    { header: 'Salary (₹)', key: 'salary' },
    { header: 'Joining Date', key: 'joiningDate' },
    { header: 'Status', key: 'status' },
  ]
  data.workers.forEach((w) => {
    workerSheet.addRow({
      workerId: w.workerId || '-',
      name: w.name || '-',
      department: w.department || 'General',
      phone: w.phone || '-',
      salary: Number(w.salary) || 0,
      joiningDate: formatDate(w.joiningDate),
      status: w.status || 'Active',
    })
  })
  applyHeaderStyle(workerSheet)
  workerSheet.autoFilter = 'A1:G1'
  autoFitColumns(workerSheet)

  // 6. Sheet 6: Production Logs
  const prodSheet = workbook.addWorksheet('Production Logs')
  prodSheet.columns = [
    { header: 'Date', key: 'date' },
    { header: 'Department', key: 'department' },
    { header: 'Worker Name', key: 'workerName' },
    { header: 'Design / Item', key: 'design' },
    { header: 'Pieces', key: 'pieces' },
    { header: 'Rate (₹)', key: 'rate' },
    { header: 'Total (₹)', key: 'total' },
    { header: 'Status', key: 'status' },
  ]
  data.production.forEach((p) => {
    prodSheet.addRow({
      date: formatDate(p.date),
      department: p.department || '-',
      workerName: p.workerName || p.worker?.name || '-',
      design: p.design || '-',
      pieces: Number(p.pieces) || 0,
      rate: Number(p.rate) || 0,
      total: Number(p.total) || 0,
      status: p.status || 'Completed',
    })
  })
  applyHeaderStyle(prodSheet)
  prodSheet.autoFilter = 'A1:H1'
  autoFitColumns(prodSheet)

  // 7. Sheet 7: Departments
  const deptSheet = workbook.addWorksheet('Departments')
  deptSheet.columns = [
    { header: 'Department Name', key: 'name' },
    { header: 'Description', key: 'description' },
    { header: 'Created At', key: 'createdAt' },
  ]
  data.departments.forEach((d) => {
    deptSheet.addRow({
      name: d.name || '-',
      description: d.description || '-',
      createdAt: formatDate(d.createdAt),
    })
  })
  applyHeaderStyle(deptSheet)
  deptSheet.autoFilter = 'A1:C1'
  autoFitColumns(deptSheet)

  // 8. Sheet 8: System Users (Safe Business Info Only)
  const userSheet = workbook.addWorksheet('Users')
  userSheet.columns = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Role', key: 'role' },
    { header: 'Status', key: 'status' },
    { header: 'Created Date', key: 'createdAt' },
  ]
  data.users.forEach((u) => {
    userSheet.addRow({
      name: u.name || '-',
      email: u.email || '-',
      role: u.role || 'worker',
      status: u.resetToken ? 'Pending' : 'Active',
      createdAt: formatDate(u.createdAt),
    })
  })
  applyHeaderStyle(userSheet)
  userSheet.autoFilter = 'A1:E1'
  autoFitColumns(userSheet)

  // 9. Sheet 9: Company Settings
  const settingsSheet = workbook.addWorksheet('Company Settings')
  settingsSheet.columns = [
    { header: 'Setting Field', key: 'field' },
    { header: 'Value', key: 'value' },
  ]
  data.settings.forEach((s) => {
    settingsSheet.addRow({
      field: s.companyName ? 'Company Profile' : (s.key || 'Settings'),
      value: s.companyName ? `${s.companyName} (${s.gstin || s.gstNumber || 'No GST'})` : String(s.value || '-'),
    })
  })
  applyHeaderStyle(settingsSheet)
  settingsSheet.autoFilter = 'A1:B1'
  autoFitColumns(settingsSheet)

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
