import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, Package, Loader2, Image as ImageIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TablePagination } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getIncoming, createIncoming, updateIncoming, deleteIncoming, bulkDeleteIncoming, exportFile, getItems } from '@/lib/services'
import { ItemPreviewModal } from '@/components/ui/item-preview-modal'
import { FABRICS } from '@/lib/constants'
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { useTableState } from '@/hooks/use-table-state'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { getErrorMessage } from '@/lib/api'
import { TableSkeleton } from '@/components/ui/table-skeleton'

export function IncomingStockPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [exportType, setExportType] = useState<'csv' | 'excel' | 'pdf' | 'print' | null>(null)
  const [previewItem, setPreviewItem] = useState<any>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const handlePrint = async (fDate: string, tDate: string) => {
    const token = localStorage.getItem('mira-token')
    const queryParams = new URLSearchParams()
    if (fDate) queryParams.append('fromDate', fDate)
    if (tDate) queryParams.append('toDate', tDate)
    queryParams.append('pageSize', '10000')
    
    const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/incoming?${queryParams.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to fetch print data')
    const payload = await res.json()
    const rows = payload.data
    
    if (rows.length === 0) {
      toast('error', 'No records found', 'No records found for the selected date range')
      return
    }
    
    const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
    const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Mira Creation - Incoming Stock Report</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
            .subtitle { text-align: center; font-size: 14px; margin-bottom: 25px; color: #666; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .summary { font-size: 13px; font-weight: bold; line-height: 1.8; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Mira Creation - Incoming Stock Report</h1>
          <div class="subtitle">From Date: ${fDate || 'N/A'} &nbsp;&nbsp;&nbsp; To Date: ${tDate || 'N/A'}</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>SR No</th>
                <th>Design</th>
                <th>Fabric</th>
                <th>Pieces</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r: any) => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.srNo || ''}</td>
                  <td>${r.design || ''}</td>
                  <td>${r.fabric || ''}</td>
                  <td>${r.pieces}</td>
                  <td>${r.rate}</td>
                  <td>₹${r.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <div>Total Entries: ${rows.length}</div>
            <div>Total Pieces: ${totalPieces}</div>
            <div>Grand Total: ₹${grandTotal}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleConfirmExport = async () => {
    if (!fromDate || !toDate) {
      toast('error', 'Select date range', 'Please select both From Date and To Date.')
      return
    }
    
    setIsExporting(true)
    try {
      const token = localStorage.getItem('mira-token')
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        pageSize: '1',
      })
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/incoming?${queryParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to verify entries')
      const payload = await res.json()
      
      if (payload.data.length === 0) {
        toast('error', 'No records found', 'No records found for the selected date range.')
        setIsExporting(false)
        return
      }
      
      if (exportType === 'print') {
        await handlePrint(fromDate, toDate)
      } else {
        await exportFile(`/export/incoming/${exportType}?fromDate=${fromDate}&toDate=${toDate}`)
      }
      
      setExportType(null)
    } catch (err) {
      toast('error', 'Export failed', 'Something went wrong during export.')
    } finally {
      setIsExporting(false)
    }
  }

  const setQuickDateRange = (type: 'this-month' | 'last-month') => {
    const today = new Date()
    if (type === 'this-month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setFromDate(firstDay.toISOString().split('T')[0])
      setToDate(lastDay.toISOString().split('T')[0])
    } else if (type === 'last-month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      setFromDate(firstDay.toISOString().split('T')[0])
      setToDate(lastDay.toISOString().split('T')[0])
    }
  }

  const { tableState, setTableState, nextPage, prevPage } = useTableState({
    page: 1,
    pageSize: 10,
    search: searchTerm,
  })

  // Sync search term with table state
  useEffect(() => {
    setTableState((prev) => ({ ...prev, search: searchTerm, page: 1 }))
  }, [searchTerm, setTableState])

  const { data: incomingData, isLoading } = useQuery({
    queryKey: ['incoming', tableState],
    queryFn: () => getIncoming(tableState),
  })

  const createMutation = useMutation({
    mutationFn: createIncoming,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming'] })
      setIsModalOpen(false)
      setEditingEntry(null)
      toast('success', 'Entry created', 'Incoming stock entry has been added.')
    },
    onError: (error: any) => {
      toast('error', 'Create failed', getErrorMessage(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateIncoming(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming'] })
      setIsModalOpen(false)
      setEditingEntry(null)
      toast('success', 'Entry updated', 'Incoming stock entry has been updated.')
    },
    onError: (error: any) => {
      toast('error', 'Update failed', getErrorMessage(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteIncoming,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming'] })
      toast('success', 'Entry deleted', 'Incoming stock entry has been removed.')
    },
    onError: (error: any) => {
      toast('error', 'Delete failed', getErrorMessage(error))
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteIncoming,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming'] })
      setSelectedIds([])
      toast('success', 'Entries deleted', 'Selected entries have been removed.')
    },
    onError: (error: any) => {
      toast('error', 'Delete failed', getErrorMessage(error))
    },
  })

  const handleEdit = (entry: any) => {
    setEditingEntry(entry)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget)
      setDeleteTarget(null)
    }
  }

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedIds)
    setBulkDeleteOpen(false)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(incomingData?.data.map((d) => d.id) || [])
    } else {
      setSelectedIds([])
    }
  }

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const entries = incomingData?.data || []
  const pagination = incomingData?.pagination || { page: 1, totalPages: 1, total: 0, pageSize: 10 }

  return (
    <div className="space-y-section-gap">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-display text-on-background dark:text-dark-text">Incoming Stock</h1>
          <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
            Track incoming fabric and materials
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {selectedIds.length > 0 && !isReadOnly && (
            <Button
              variant="danger"
              size="md"
              className="w-11 h-11 p-0 flex items-center justify-center relative rounded-xl flex-shrink-0 mr-3"
              onClick={() => setBulkDeleteOpen(true)}
              title={`Delete Selected (${selectedIds.length})`}
            >
              <Trash2 className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 bg-white text-error dark:text-dark-danger font-bold text-[10px] rounded-full w-5 h-5 flex items-center justify-center border border-error dark:border-dark-danger shadow-md">
                {selectedIds.length}
              </span>
            </Button>
          )}
          <ExportDropdown
            className="w-full sm:w-auto"
            onExportCSV={() => setExportType('csv')}
            onExportExcel={() => setExportType('excel')}
            onExportPDF={() => setExportType('pdf')}
            onPrint={() => setExportType('print')}
          />
          {!isReadOnly && (
            <Button variant="primary" className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="relative w-full sm:w-80 lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant dark:text-dark-text-muted" />
            <Input
              placeholder="Search by SR No, Design, Fabric..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <TableSkeleton columns={7} rows={6} />
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant dark:text-dark-text-muted">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-body-md">No incoming stock entries found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  {!isReadOnly && (
                    <TableHeaderCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === entries.length && entries.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                    </TableHeaderCell>
                  )}
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>SR No</TableHeaderCell>
                  <TableHeaderCell>Design</TableHeaderCell>
                  <TableHeaderCell>Fabric</TableHeaderCell>
                  <TableHeaderCell>Pieces</TableHeaderCell>
                  <TableHeaderCell>Rate</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  {!isReadOnly && <TableHeaderCell>Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    {!isReadOnly && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => handleSelect(entry.id)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                    )}
                    <TableCell className="opacity-80" dataLabel="Date">{entry.date}</TableCell>
                     <TableCell dataLabel="SR No">
                      {entry.item ? (
                        <div className="flex flex-col items-start">
                          <button
                            onClick={() => setPreviewItem(entry.item)}
                            className="font-bold text-primary dark:text-dark-primary font-code text-code hover:underline text-left focus:outline-none"
                          >
                            {entry.srNo || '-'}
                          </button>
                          {entry.item.itemName && (
                            <button
                              onClick={() => setPreviewItem(entry.item)}
                              className="text-[10px] text-on-surface-variant dark:text-dark-text-muted hover:underline mt-0.5 text-left focus:outline-none font-medium"
                            >
                              ({entry.item.itemName})
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="font-code text-code opacity-80">{entry.srNo || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell dataLabel="Design">
                      {entry.item ? (
                        <button
                          onClick={() => setPreviewItem(entry.item)}
                          className="font-semibold text-primary dark:text-dark-primary hover:underline text-left focus:outline-none"
                        >
                          {entry.design || '-'}
                        </button>
                      ) : (
                        <span>{entry.design || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell dataLabel="Fabric">{entry.fabric}</TableCell>
                    <TableCell dataLabel="Pieces">{formatNumber(entry.pieces)}</TableCell>
                    <TableCell dataLabel="Rate">{formatCurrency(entry.rate)}</TableCell>
                    <TableCell className="font-bold" dataLabel="Total">{formatCurrency(entry.total)}</TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover text-on-surface-variant dark:text-dark-text-muted"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-danger"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalEntries={pagination.total}
              pageSize={pagination.pageSize}
              onPrevious={prevPage}
              onNext={nextPage}
            />
          </>
        )}
      </Card>

      {/* Delete Confirmations */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Entry"
        message="Are you sure you want to delete this incoming stock entry? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Entries"
        message={`Are you sure you want to delete ${selectedIds.length} selected entries? This action cannot be undone.`}
        isLoading={bulkDeleteMutation.isPending}
      />

      {/* Date Range Export Modal */}
      <Modal
        isOpen={exportType !== null}
        onClose={() => setExportType(null)}
        title={`Export Report - ${exportType?.toUpperCase()}`}
      >
        <div className="space-y-4 py-2">
          <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
            Select the date range for the exported report.
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQuickDateRange('this-month')}
              className="flex-1"
            >
              This Month
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQuickDateRange('last-month')}
              className="flex-1"
            >
              Last Month
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="From Date *"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              required
            />
            <Input
              type="date"
              label="To Date *"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              required
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setExportType(null)} disabled={isExporting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmExport} isLoading={isExporting}>
            Export
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal */}
      <IncomingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingEntry(null)
        }}
        entry={editingEntry}
        onSubmit={editingEntry
          ? (data: any) => updateMutation.mutate({ id: editingEntry.id, data })
          : (data: any) => createMutation.mutate(data)
        }
        isLoading={editingEntry ? updateMutation.isPending : createMutation.isPending}
      />
      {/* Item Preview Modal */}
      <ItemPreviewModal
        isOpen={previewItem !== null}
        onClose={() => setPreviewItem(null)}
        item={previewItem}
      />
    </div>
  )
}

export function IncomingModal({
  isOpen,
  onClose,
  entry,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  entry: any
  onSubmit: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    date: '',
    srNo: '',
    design: '',
    fabric: '',
    pieces: '',
    rate: '',
    notes: '',
    itemId: '',
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: itemsData } = useQuery({
    queryKey: ['items-autocomplete'],
    queryFn: () => getItems({ pageSize: 1000 }),
    enabled: isOpen,
  })
  const items = itemsData?.data || []

  const suggestions = formData.srNo.trim()
    ? items.filter((item: any) =>
        item.itemCode.toLowerCase().includes(formData.srNo.toLowerCase())
      )
    : []

  const handleSelectSuggestion = (item: any) => {
    setFormData((prev) => {
      const updated = { ...prev }
      updated.itemId = item.id
      updated.srNo = item.itemCode
      if (!prev.fabric || prev.fabric === '') {
        updated.fabric = item.fabricName
      }
      if (!prev.design || prev.design === '') {
        updated.design = item.itemName || ''
      }
      return updated
    })
    setShowSuggestions(false)
  }

  useEffect(() => {
    if (entry) {
      setFormData({
        date: entry.date || '',
        srNo: entry.srNo || '',
        design: entry.design || '',
        fabric: entry.fabric || '',
        pieces: entry.pieces?.toString() || '',
        rate: entry.rate?.toString() || '',
        notes: entry.notes || '',
        itemId: entry.itemId || '',
      })
    } else {
      const today = new Date()
      const day = String(today.getDate()).padStart(2, '0')
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const year = today.getFullYear()
      setFormData({
        date: `${day}-${month}-${year}`,
        srNo: '',
        design: '',
        fabric: '',
        pieces: '',
        rate: '',
        notes: '',
        itemId: '',
      })
    }
  }, [entry, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = {
      date: formData.date,
      fabric: formData.fabric,
      pieces: parseInt(formData.pieces) || 0,
      rate: parseFloat(formData.rate) || 0,
      total: (parseInt(formData.pieces) || 0) * (parseFloat(formData.rate) || 0),
    }
    if (formData.srNo) data.srNo = formData.srNo
    if (formData.design) data.design = formData.design
    if (formData.notes) data.notes = formData.notes
    
    const matched = items.find((i: any) => i.itemCode.toLowerCase() === formData.srNo.trim().toLowerCase())
    if (matched) {
      data.itemId = matched.id
    } else if (formData.itemId) {
      data.itemId = formData.itemId
    }

    onSubmit(data)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={entry ? 'Edit Entry' : 'Add New Entry'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-stack-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <Input
            label="Date *"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            placeholder="dd-mm-yyyy"
            required
          />
          <div className="relative">
            <Input
              label="SR No"
              value={formData.srNo}
              onChange={(e) => {
                setFormData({ ...formData, srNo: e.target.value, itemId: '' })
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200)
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[72px] z-[200] bg-surface-container-high dark:bg-dark-input border border-outline-variant dark:border-dark-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {suggestions.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(item)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-highest dark:hover:bg-dark-hover cursor-pointer transition-colors border-b border-outline-variant/30 dark:border-dark-border/30 last:border-none"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-container dark:bg-dark-hover flex items-center justify-center border border-outline-variant dark:border-dark-border flex-shrink-0">
                      {item.itemImage ? (
                        <img
                          src={
                            item.itemImage.startsWith('http')
                              ? item.itemImage
                              : `${import.meta.env.VITE_API_URL || ''}${item.itemImage}`
                          }
                          alt={item.itemName || item.itemCode}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-on-surface-variant/40 dark:text-dark-text-muted/40" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold font-code text-primary dark:text-dark-primary text-body-sm">{item.itemCode}</p>
                      {item.itemName && (
                        <p className="text-[10px] text-on-surface-variant dark:text-dark-text-muted">{item.itemName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-low dark:bg-dark-border text-on-surface dark:text-dark-text opacity-85 font-medium">
                        {item.fabricName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            label="Design"
            value={formData.design}
            onChange={(e) => setFormData({ ...formData, design: e.target.value })}
          />
          <Input
            label="Fabric *"
            value={formData.fabric}
            onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
            required
          />
          <Input
            label="Pieces *"
            inputMode="numeric"
            value={formData.pieces}
            onChange={(e) => setFormData({ ...formData, pieces: e.target.value })}
            required
          />
          <Input
            label="Rate *"
            inputMode="decimal"
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            required
          />
        </div>
        <Input
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </form>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
          {entry ? 'Update Entry' : 'Add Entry'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}