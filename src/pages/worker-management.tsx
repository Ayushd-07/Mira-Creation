import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, User, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TablePagination } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getWorkers, getDepartments, createWorker, updateWorker, deleteWorker } from '@/lib/services'
import { toast } from '@/components/ui/toast'
import { useTableState } from '@/hooks/use-table-state'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'

export function WorkerManagementPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<any>(null)
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

  const { data: workersData, isLoading } = useQuery({
    queryKey: ['workers', tableState],
    queryFn: () => getWorkers(tableState),
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  const createMutation = useMutation({
    mutationFn: createWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      setIsModalOpen(false)
      setEditingWorker(null)
      toast('success', 'Worker created', 'Worker has been added successfully.')
    },
    onError: (error: any) => {
      toast('error', 'Create failed', getErrorMessage(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateWorker(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      setIsModalOpen(false)
      setEditingWorker(null)
      toast('success', 'Worker updated', 'Worker has been updated successfully.')
    },
    onError: (error: any) => {
      toast('error', 'Update failed', getErrorMessage(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      toast('success', 'Worker deleted', 'Worker has been removed.')
    },
    onError: (error: any) => {
      toast('error', 'Delete failed', getErrorMessage(error))
    },
  })

  const handleEdit = (worker: any) => {
    setEditingWorker(worker)
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

  const workers = workersData?.data || []
  const pagination = workersData?.pagination || { page: 1, totalPages: 1, total: 0, pageSize: 10 }

  return (
    <div className="space-y-section-gap">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-display text-on-background dark:text-dark-text">Worker Management</h1>
          <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
            Manage your workforce and track assignments
          </p>
        </div>
        {!isReadOnly && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Worker
          </Button>
        )}
      </div>

      {/* Search & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter animate-fade-in">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80 lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant dark:text-dark-text-muted" />
              <Input
                placeholder="Search workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="w-full sm:w-60">
              <Select
                value={tableState.department}
                onChange={(e) => setTableState((prev) => ({ ...prev, department: e.target.value, page: 1 }))}
                options={[
                  { value: 'all', label: 'All Departments' },
                  { value: 'HOTFIX', label: 'HOTFIX' },
                  { value: 'LACE', label: 'LACE' },
                  { value: 'FIX RATE', label: 'FIX RATE' },
                  { value: 'AARI & JENTS STICH', label: 'AARI & JENTS STICH' },
                  { value: 'DIAMONDS', label: 'DIAMONDS' },
                ]}
                placeholder="Filter by Department"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5 flex items-center justify-between h-full">
            <div>
              <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">Total Workers</p>
              <h3 className="font-display text-display-md text-on-background dark:text-dark-text mt-1">
                {pagination.total}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : workers.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant dark:text-dark-text-muted">
            <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-body-md">No workers found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Department</TableHeaderCell>
                  <TableHeaderCell>Phone</TableHeaderCell>
                  {!isReadOnly && <TableHeaderCell>Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell dataLabel="Name">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {worker.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-on-surface dark:text-dark-text block">{worker.name}</span>
                          <span className="font-code text-xs text-on-surface-variant dark:text-dark-text-muted opacity-75">{worker.workerId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell dataLabel="Department">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20 dark:text-dark-text border border-primary/20">
                        {worker.department}
                      </span>
                    </TableCell>
                    <TableCell dataLabel="Phone">{worker.phone}</TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(worker)}
                            className="p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover text-on-surface-variant dark:text-dark-text-muted"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(worker.id)}
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
        title="Delete Worker"
        message="Are you sure you want to delete this worker? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />

      {/* Worker Modal */}
      <WorkerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingWorker(null)
        }}
        worker={editingWorker}
        onSubmit={editingWorker
          ? (data: any) => updateMutation.mutate({ id: editingWorker.id, data })
          : (data: any) => createMutation.mutate(data)
        }
        isLoading={editingWorker ? updateMutation.isPending : createMutation.isPending}
        departments={departments}
      />
    </div>
  )
}

function WorkerModal({
  isOpen,
  onClose,
  worker,
  onSubmit,
  isLoading,
  departments,
}: {
  isOpen: boolean
  onClose: () => void
  worker: any
  onSubmit: (data: any) => void
  isLoading: boolean
  departments: any[]
}) {
  const [formData, setFormData] = useState({
    name: '',
    workerId: '',
    department: '',
    phone: '',
    email: '',
    address: '',
    joiningDate: '',
  })

  useEffect(() => {
    if (worker) {
      setFormData({
        name: worker.name || '',
        workerId: worker.workerId || '',
        department: worker.department || '',
        phone: worker.phone || '',
        email: worker.email || '',
        address: worker.address || '',
        joiningDate: worker.joiningDate || '',
      })
    } else {
      setFormData({
        name: '',
        workerId: '',
        department: '',
        phone: '',
        email: '',
        address: '',
        joiningDate: '',
      })
    }
  }, [worker])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedPhone = formData.phone.replace(/\D/g, '')
    if (cleanedPhone.length !== 10 && !(cleanedPhone.length === 12 && cleanedPhone.startsWith('91'))) {
      toast('error', 'Invalid Phone', 'Phone number must be a valid 10-digit Indian mobile number')
      return
    }
    const finalPhone = cleanedPhone.length === 12 && cleanedPhone.startsWith('91') ? cleanedPhone.slice(2) : cleanedPhone

    const payload: any = {
      name: formData.name,
      workerId: formData.workerId,
      department: formData.department,
      phone: finalPhone,
    }
    if (formData.email) payload.email = formData.email
    if (formData.address) payload.address = formData.address
    if (formData.joiningDate) payload.joiningDate = formData.joiningDate
    onSubmit(payload)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={worker ? 'Edit Worker' : 'Add New Worker'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-stack-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Worker ID *"
            value={formData.workerId}
            onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
            required
          />
          <Select
            label="Department *"
            options={[
              { value: 'HOTFIX', label: 'HOTFIX' },
              { value: 'LACE', label: 'LACE' },
              { value: 'FIX RATE', label: 'FIX RATE' },
              { value: 'AARI & JENTS STICH', label: 'AARI & JENTS STICH' },
              { value: 'DIAMONDS', label: 'DIAMONDS' },
            ]}
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="Select department"
            required
          />
          <Input
            label="Phone *"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Joining Date"
            value={formData.joiningDate}
            onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
            placeholder="dd-mm-yyyy"
          />
        </div>
        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </form>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
          {worker ? 'Update Worker' : 'Add Worker'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}