import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, Package, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TablePagination } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getIncoming, createIncoming, updateIncoming, deleteIncoming, bulkDeleteIncoming, exportFile } from '@/lib/services'
import { FABRICS } from '@/lib/constants'
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { useTableState } from '@/hooks/use-table-state'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'

export function IncomingStockPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

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
          {selectedIds.length > 0 && user?.role === 'admin' && (
            <Button
              variant="danger"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          <ExportDropdown
            className="w-full sm:w-auto"
            onExportCSV={() => exportFile('/export/incoming/csv')}
            onExportExcel={() => exportFile('/export/incoming/excel')}
            onExportPDF={() => exportFile('/export/incoming/pdf')}
          />
          {user?.role === 'admin' && (
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
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
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
                  <TableHeaderCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === entries.length && entries.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>SR No</TableHeaderCell>
                  <TableHeaderCell>Design</TableHeaderCell>
                  <TableHeaderCell>Fabric</TableHeaderCell>
                  <TableHeaderCell>Pieces</TableHeaderCell>
                  <TableHeaderCell>Rate</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Supplier</TableHeaderCell>
                  {user?.role === 'admin' && <TableHeaderCell>Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => handleSelect(entry.id)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="opacity-80" dataLabel="Date">{entry.date}</TableCell>
                    <TableCell className="font-code text-code text-primary" dataLabel="SR No">{entry.srNo}</TableCell>
                    <TableCell dataLabel="Design">{entry.design}</TableCell>
                    <TableCell dataLabel="Fabric">{entry.fabric}</TableCell>
                    <TableCell dataLabel="Pieces">{formatNumber(entry.pieces)}</TableCell>
                    <TableCell dataLabel="Rate">{formatCurrency(entry.rate)}</TableCell>
                    <TableCell className="font-bold" dataLabel="Total">{formatCurrency(entry.total)}</TableCell>
                    <TableCell dataLabel="Supplier">{entry.supplier || '-'}</TableCell>
                    {user?.role === 'admin' && (
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
  })

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
      })
    }
  }, [entry])

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
          <Input
            label="SR No"
            value={formData.srNo}
            onChange={(e) => setFormData({ ...formData, srNo: e.target.value })}
          />
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