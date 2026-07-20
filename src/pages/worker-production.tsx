import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, Cog, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TablePagination } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getProduction, getWorkersAll, createProduction, updateProduction, deleteProduction, exportFile, bulkDeleteProduction } from '@/lib/services'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { FABRICS, PRODUCTION_STATUS } from '@/lib/constants'
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { useTableState } from '@/hooks/use-table-state'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { TableSkeleton } from '@/components/ui/table-skeleton'

export function WorkerProductionPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [exportType, setExportType] = useState<'csv' | 'excel' | 'pdf' | 'print' | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState('all')
  const [isExporting, setIsExporting] = useState(false)

  const handlePrint = async (fDate: string, tDate: string, wId: string) => {
    const token = localStorage.getItem('mira-token')
    const queryParams = new URLSearchParams()
    if (fDate) queryParams.append('fromDate', fDate)
    if (tDate) queryParams.append('toDate', tDate)
    if (wId && wId !== 'all') queryParams.append('workerId', wId)
    queryParams.append('pageSize', '10000')
    
    const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/production?${queryParams.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to fetch print data')
    const payload = await res.json()
    const rows = payload.data
    
    if (rows.length === 0) {
      toast('error', 'No records found', 'No records found for the selected options')
      return
    }
    
    const totalPieces = rows.reduce((sum: number, r: any) => sum + r.pieces, 0)
    const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0)
    
    const selectedWorker = workers.find((w: any) => w.id === wId)
    const workerNameDisplay = selectedWorker ? selectedWorker.name : 'All Workers'
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Mira Creation - Worker Production Report</title>
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
          <h1>Mira Creation - Worker Production Report</h1>
          <div class="subtitle">From Date: ${fDate || 'N/A'} &nbsp;&nbsp;&nbsp; To Date: ${tDate || 'N/A'} &nbsp;&nbsp;&nbsp; Worker: ${workerNameDisplay}</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Worker Name</th>
                <th>Department</th>
                <th>Design</th>
                <th>Pieces</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r: any) => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.workerName || ''}</td>
                  <td>${r.department || ''}</td>
                  <td>${r.design || ''}</td>
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
            <div>Grand Total: Rs. ${grandTotal}</div>
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
      if (selectedWorkerId && selectedWorkerId !== 'all') {
        queryParams.append('workerId', selectedWorkerId)
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/production?${queryParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to verify entries')
      const payload = await res.json()
      
      if (payload.data.length === 0) {
        toast('error', 'No records found', 'No records found for the selected options.')
        setIsExporting(false)
        return
      }
      
      if (exportType === 'print') {
        await handlePrint(fromDate, toDate, selectedWorkerId)
      } else {
        await exportFile(`/export/production/${exportType}?fromDate=${fromDate}&toDate=${toDate}&workerId=${selectedWorkerId}`)
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

  const { data: productionData, isLoading } = useQuery({
    queryKey: ['production', tableState],
    queryFn: () => getProduction(tableState),
  })

  const { data: workers = [] } = useQuery({
    queryKey: ['workers-all'],
    queryFn: getWorkersAll,
  })

  const createMutation = useMutation({
    mutationFn: createProduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] })
      setIsModalOpen(false)
      setEditingEntry(null)
      toast('success', 'Entry created', 'Production entry has been added.')
    },
    onError: (error: any) => {
      toast('error', 'Create failed', getErrorMessage(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] })
      setIsModalOpen(false)
      setEditingEntry(null)
      toast('success', 'Entry updated', 'Production entry has been updated.')
    },
    onError: (error: any) => {
      toast('error', 'Update failed', getErrorMessage(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] })
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget))
      toast('success', 'Entry deleted', 'Production entry has been removed.')
    },
    onError: (error: any) => {
      toast('error', 'Delete failed', getErrorMessage(error))
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteProduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] })
      setSelectedIds([])
      setBulkDeleteOpen(false)
      toast('success', 'Entries deleted', 'Selected production entries have been removed.')
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
    if (selectedIds.length > 0) {
      bulkDeleteMutation.mutate(selectedIds)
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(entries.map((d: any) => d.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const entries = productionData?.data || []
  const pagination = productionData?.pagination || { page: 1, totalPages: 1, total: 0, pageSize: 10 }

  return (
    <div className="space-y-section-gap">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-display text-on-background dark:text-dark-text">Worker Production</h1>
          <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
            Track production work and assignments
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
              placeholder="Search by Design, Worker..."
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
            <Cog className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-body-md">No production entries found</p>
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
                  <TableHeaderCell>Worker</TableHeaderCell>
                  <TableHeaderCell>Design</TableHeaderCell>
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
                    <TableCell dataLabel="Worker">
                      <div className="font-medium text-on-surface dark:text-dark-text">{entry.workerName}</div>
                      <div className="text-[11px] text-on-surface-variant dark:text-dark-text-muted mt-0.5">{entry.department}</div>
                    </TableCell>
                    <TableCell dataLabel="Design">{entry.design}</TableCell>
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Entry"
        message="Are you sure you want to delete this production entry? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Entries"
        message={`Are you sure you want to delete ${selectedIds.length} selected entries? This action cannot be undone.`}
        isLoading={bulkDeleteMutation.isPending}
      />

      {/* Date Range & Worker Export Modal */}
      <Modal
        isOpen={exportType !== null}
        onClose={() => setExportType(null)}
        title={`Export Report - ${exportType?.toUpperCase()}`}
      >
        <div className="space-y-4 py-2">
          <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
            Select the options for the exported report.
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

          <Select
            label="Worker"
            options={[
              { value: 'all', label: 'All Workers' },
              ...workers.map((w: any) => ({ value: w.id, label: `${w.name} (${w.department})` }))
            ]}
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
          />
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
      <ProductionModal
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
        workers={workers}
      />
    </div>
  )
}

function ProductionModal({
  isOpen,
  onClose,
  entry,
  onSubmit,
  isLoading,
  workers,
}: {
  isOpen: boolean
  onClose: () => void
  entry: any
  onSubmit: (data: any) => void
  isLoading: boolean
  workers: any[]
}) {
  const [formData, setFormData] = useState({
    date: '',
    workerId: '',
    design: '',
    pieces: '',
    rate: '',
    notes: '',
  })

  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [workerSearch, setWorkerSearch] = useState('')

  const departments = ['HOTFIX', 'LACE', 'FIX RATE', 'AARI & JENTS STICH', 'DIAMONDS']

  const filteredWorkers = workers.filter(w => {
    const matchesDepartment = !selectedDepartment || w.department === selectedDepartment
    const matchesSearch = !workerSearch || w.name.toLowerCase().includes(workerSearch.toLowerCase())
    return matchesDepartment && matchesSearch
  })

  useEffect(() => {
    if (entry) {
      setFormData({
        date: entry.date || '',
        workerId: entry.workerId || '',
        design: entry.design || '',
        pieces: entry.pieces?.toString() || '',
        rate: entry.rate?.toString() || '',
        notes: entry.notes || '',
      })
      setSelectedDepartment(entry.workerDepartment || '')
    } else {
      const today = new Date()
      const day = String(today.getDate()).padStart(2, '0')
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const year = today.getFullYear()
      setFormData({
        date: `${day}-${month}-${year}`,
        workerId: '',
        design: '',
        pieces: '',
        rate: '',
        notes: '',
      })
      setSelectedDepartment('')
      setWorkerSearch('')
    }
  }, [entry])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedWorker = workers.find(w => w.id === formData.workerId)
    onSubmit({
      date: formData.date,
      workerId: formData.workerId,
      workerName: selectedWorker?.name || '',
      department: selectedWorker?.department || '',
      design: formData.design,
      pieces: parseInt(formData.pieces) || 0,
      rate: parseFloat(formData.rate) || 0,
      notes: formData.notes || undefined,
    })
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
          <Select
            label="Department"
            options={[
              { value: '', label: 'Select Department' },
              ...departments.map(d => ({ value: d, label: d }))
            ]}
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value)
              setFormData({ ...formData, workerId: '' })
            }}
            required
          />
          <div className="relative">
            <Select
              label="Worker *"
              options={filteredWorkers.map(w => ({ value: w.id, label: w.name }))}
              value={formData.workerId}
              onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
              placeholder="Select worker"
              required
            />
            <div className="mt-1">
              <Input
                placeholder="Search workers..."
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <Input
            label="Design *"
            value={formData.design}
            onChange={(e) => setFormData({ ...formData, design: e.target.value })}
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