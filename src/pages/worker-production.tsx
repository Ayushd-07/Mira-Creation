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
import { getProduction, getWorkersAll, createProduction, updateProduction, deleteProduction } from '@/lib/services'
import { FABRICS, PRODUCTION_STATUS } from '@/lib/constants'
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { useTableState } from '@/hooks/use-table-state'
import { getErrorMessage } from '@/lib/api'

export function WorkerProductionPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

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
      toast('success', 'Entry deleted', 'Production entry has been removed.')
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
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Entry
        </Button>
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
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
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
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Worker</TableHeaderCell>
                  <TableHeaderCell>Department</TableHeaderCell>
                  <TableHeaderCell>Design</TableHeaderCell>
                  <TableHeaderCell>Pieces</TableHeaderCell>
                  <TableHeaderCell>Rate</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="opacity-80" dataLabel="Date">{entry.date}</TableCell>
                    <TableCell dataLabel="Worker">{entry.workerName}</TableCell>
                    <TableCell dataLabel="Department">{entry.department}</TableCell>
                    <TableCell dataLabel="Design">{entry.design}</TableCell>
                    <TableCell dataLabel="Pieces">{formatNumber(entry.pieces)}</TableCell>
                    <TableCell dataLabel="Rate">{formatCurrency(entry.rate)}</TableCell>
                    <TableCell className="font-bold" dataLabel="Total">{formatCurrency(entry.total)}</TableCell>
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