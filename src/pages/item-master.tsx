import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, Box, Loader2, Eye, Download, Copy, Printer, X, Image as ImageIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TablePagination } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getItems, createItem, updateItem, deleteItem, uploadItemImage, exportFile } from '@/lib/services'
import { FABRICS } from '@/lib/constants'
import { toast } from '@/components/ui/toast'
import { getErrorMessage } from '@/lib/api'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { ItemLightbox } from '@/components/ui/item-lightbox'
import { ItemPreviewModal } from '@/components/ui/item-preview-modal'

export function ItemMasterPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [viewingItem, setViewingItem] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  // Filters State
  const [filterSearch, setFilterSearch] = useState('')

  // Table Page State
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Debounced filters for query
  const [queryState, setQueryState] = useState({
    page: 1,
    pageSize: 10,
    search: '',
  })

  // Sync state to queryState with 300ms debounce for inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setQueryState({
        page,
        pageSize,
        search: filterSearch,
      })
    }, 300)

    return () => clearTimeout(handler)
  }, [page, pageSize, filterSearch])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filterSearch])

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['items', queryState],
    queryFn: () => getItems(queryState),
  })

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setIsModalOpen(false)
      setEditingItem(null)
      toast('success', 'Item created', 'Item has been added to the master successfully.')
    },
    onError: (error: any) => {
      toast('error', 'Create failed', getErrorMessage(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setIsModalOpen(false)
      setEditingItem(null)
      toast('success', 'Item updated', 'Item details have been updated successfully.')
    },
    onError: (error: any) => {
      toast('error', 'Update failed', getErrorMessage(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast('success', 'Item deleted', 'Item has been successfully removed.')
    },
    onError: (error: any) => {
      toast('error', 'Delete failed', getErrorMessage(error))
    },
  })

  const handleEdit = (item: any) => {
    setEditingItem(item)
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

  const handleClearFilters = () => {
    setFilterSearch('')
    setPage(1)
  }

  // Print Table
  const handlePrint = async () => {
    try {
      const token = localStorage.getItem('mira-token')
      const queryParams = new URLSearchParams()
      if (filterSearch) queryParams.append('search', filterSearch)
      queryParams.append('pageSize', '10000')

      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/items?${queryParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch print data')
      const payload = await res.json()
      const rows = payload.data

      if (rows.length === 0) {
        toast('error', 'No records found', 'No records found to print.')
        return
      }

      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      printWindow.document.write(`
        <html>
          <head>
            <title>Mira Creation - Item Master Report</title>
            <style>
              body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #333; }
              h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
              .subtitle { text-align: center; font-size: 12px; margin-bottom: 20px; color: #666; font-style: italic; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; font-size: 11px; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .thumbnail { width: 35px; height: 35px; border-radius: 4px; object-fit: cover; background: #eee; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>Mira Creation - Item Master Report</h1>
            <div class="subtitle">Generated on: ${new Date().toLocaleString()}</div>
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Image</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Fabric Name</th>
                  <th>Remark</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((r: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>
                      ${r.itemImage 
                        ? `<img src="${r.itemImage.startsWith('http') ? r.itemImage : (import.meta.env.VITE_API_URL || '') + r.itemImage}" class="thumbnail" />` 
                        : '<span style="color:#999;font-size:10px;">No Image</span>'
                      }
                    </td>
                    <td>${r.itemCode}</td>
                    <td>${r.itemName || ''}</td>
                    <td>${r.fabricName}</td>
                    <td>${r.remark || ''}</td>
                    <td>${r.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
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
    } catch (err) {
      toast('error', 'Print failed', 'Could not generate report.')
    }
  }

  // Copy Table Data
  const handleCopy = async () => {
    try {
      const token = localStorage.getItem('mira-token')
      const queryParams = new URLSearchParams()
      if (filterSearch) queryParams.append('search', filterSearch)
      queryParams.append('pageSize', '10000')

      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/items?${queryParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch copy data')
      const payload = await res.json()
      const rows = payload.data

      if (rows.length === 0) {
        toast('error', 'No records found', 'No records found to copy.')
        return
      }

      const headers = ['Sr No', 'Item Code', 'Item Name', 'Fabric Name', 'Remark', 'Status']
      const lines = [headers.join('\t')]
      rows.forEach((r: any, idx: number) => {
        lines.push([
          idx + 1,
          r.itemCode,
          r.itemName || '',
          r.fabricName,
          r.remark || '',
          r.status
        ].join('\t'))
      })

      await navigator.clipboard.writeText(lines.join('\n'))
      toast('success', 'Table Copied', 'Filtered item list copied to clipboard in TSV format.')
    } catch (err) {
      toast('error', 'Copy failed', 'Failed to copy data.')
    }
  }

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const queryParams = new URLSearchParams()
      if (filterSearch) queryParams.append('search', filterSearch)
      
      await exportFile(`/export/items/excel?${queryParams.toString()}`)
      toast('success', 'Export initiated', 'Your Excel file download will begin shortly.')
    } catch (err) {
      toast('error', 'Export failed', 'Something went wrong during export.')
    }
  }

  const items = itemsData?.data || []
  const pagination = itemsData?.pagination || { page: 1, totalPages: 1, total: 0, pageSize: 10 }

  return (
    <div className="space-y-section-gap">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-display text-on-background dark:text-dark-text">Item Master</h1>
          <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
            Manage fabric and product definitions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-2">
            <Copy className="w-4 h-4" /> Copy
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
          {!isReadOnly && (
            <Button variant="primary" onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          )}
        </div>
      </div>

      <Card className="animate-fade-in delay-100">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-dark-text-muted">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Search by code, name, or fabric..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="pl-10 h-[48px] w-full bg-surface-container-low dark:bg-dark-input border border-outline-variant/40 dark:border-dark-border/50 hover:border-primary/50 dark:hover:border-dark-primary/50 rounded-xl px-4 text-body-md text-on-surface dark:text-dark-text focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary outline-none transition-all shadow-sm"
              />
            </div>

            <Button variant="secondary" onClick={handleClearFilters} className="h-[48px] w-full sm:w-36">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="animate-fade-in delay-200">
        {isLoading ? (
          <TableSkeleton columns={5} rows={6} />
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-on-surface-variant dark:text-dark-text-muted">
            <Box className="w-12 h-12 mx-auto mb-4 stroke-1 opacity-50" />
            <p className="font-bold text-headline-sm">No Items Found</p>
            <p className="text-body-md">Create a new item or modify your search parameters.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-16">Sr No</TableHeaderCell>
                  <TableHeaderCell className="w-20">Image</TableHeaderCell>
                  <TableHeaderCell>Item Code</TableHeaderCell>
                  <TableHeaderCell>Item Name</TableHeaderCell>
                  <TableHeaderCell>Fabric Name</TableHeaderCell>
                  <TableHeaderCell>Remark</TableHeaderCell>
                  <TableHeaderCell className="w-24">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, idx) => {
                  const displayIdx = (pagination.page - 1) * pagination.pageSize + idx + 1
                  return (
                    <TableRow key={item.id}>
                      <TableCell dataLabel="Sr No">{displayIdx}</TableCell>
                      <TableCell dataLabel="Image">
                        {item.itemImage ? (
                          <button
                            onClick={() => setLightboxImage(item.itemImage || null)}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container dark:bg-dark-hover flex items-center justify-center border border-outline-variant dark:border-dark-border hover:opacity-80 transition-opacity focus:outline-none cursor-zoom-in"
                            title="Click to view full screen"
                          >
                            <img
                              src={
                                item.itemImage.startsWith('http')
                                  ? item.itemImage
                                  : `${import.meta.env.VITE_API_URL || ''}${item.itemImage}`
                              }
                              alt={item.itemName || item.itemCode}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-container dark:bg-dark-hover flex items-center justify-center border border-outline-variant dark:border-dark-border text-on-surface-variant/40 dark:text-dark-text-muted/40 font-bold">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell dataLabel="Item Code">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="font-bold text-primary dark:text-dark-primary font-code text-code hover:underline text-left focus:outline-none"
                        >
                          {item.itemCode}
                        </button>
                      </TableCell>
                      <TableCell dataLabel="Item Name">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="font-semibold text-primary dark:text-dark-primary hover:underline text-left focus:outline-none"
                        >
                          {item.itemName || '-'}
                        </button>
                      </TableCell>
                      <TableCell dataLabel="Fabric">{item.fabricName}</TableCell>
                      <TableCell className="opacity-80" dataLabel="Remark">{item.remark || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover text-on-surface-variant dark:text-dark-text-muted"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 rounded-lg hover:bg-danger/10 text-danger"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalEntries={pagination.total}
              pageSize={pagination.pageSize}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            />
          </>
        )}
      </Card>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action will permanently remove the item definition and delete its image from storage. This cannot be undone."
        isLoading={deleteMutation.isPending}
      />

      {/* View Item Details Modal */}
      <ItemPreviewModal
        isOpen={viewingItem !== null}
        onClose={() => setViewingItem(null)}
        item={viewingItem}
      />

      {/* Item Image Lightbox */}
      <ItemLightbox
        isOpen={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        imageUrl={
          lightboxImage
            ? lightboxImage.startsWith('http')
              ? lightboxImage
              : `${import.meta.env.VITE_API_URL || ''}${lightboxImage}`
            : ''
        }
        altText="Item Image"
      />

      {/* Add / Edit Item Modal */}
      <ItemFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        item={editingItem}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        isLoading={editingItem ? updateMutation.isPending : createMutation.isPending}
      />
    </div>
  )
}

function ItemFormModal({
  isOpen,
  onClose,
  item,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  item: any
  onSubmit: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    fabricName: '',
    itemImage: '',
    remark: '',
    status: 'Active',
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (item) {
      setFormData({
        itemCode: item.itemCode || '',
        itemName: item.itemName || '',
        fabricName: item.fabricName || '',
        itemImage: item.itemImage || '',
        remark: item.remark || '',
        status: item.status || 'Active',
      })
    } else {
      setFormData({
        itemCode: '',
        itemName: '',
        fabricName: '',
        itemImage: '',
        remark: '',
        status: 'Active',
      })
    }
  }, [item, isOpen])

  const uploadImageFile = async (file: File) => {
    setUploadingImage(true)
    try {
      const res = await uploadItemImage(file)
      setFormData((prev) => ({ ...prev, itemImage: res.imageUrl }))
      toast('success', 'Image Uploaded', 'The item image has been uploaded successfully.')
    } catch (err) {
      toast('error', 'Upload Failed', getErrorMessage(err))
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadImageFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast('error', 'Invalid file type', 'Please upload a JPG, JPEG, PNG, or WEBP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'File too large', 'Image size must be less than 5MB.')
      return
    }

    await uploadImageFile(file)
  }

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, itemImage: '' }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.itemCode.trim()) {
      toast('error', 'Validation Error', 'Item Code is required.')
      return
    }
    if (!formData.fabricName.trim()) {
      toast('error', 'Validation Error', 'Fabric Name is required.')
      return
    }

    const payload: any = {
      itemCode: formData.itemCode.trim(),
      fabricName: formData.fabricName,
      status: formData.status,
    }

    if (formData.itemName.trim()) payload.itemName = formData.itemName.trim()
    if (formData.itemImage) payload.itemImage = formData.itemImage
    if (formData.remark.trim()) payload.remark = formData.remark.trim()

    onSubmit(payload)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Item' : 'Add New Item'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-stack-md">
        {/* Image upload block */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted self-start">Item Image</p>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative w-32 h-32 rounded-xl overflow-hidden bg-surface-container-low dark:bg-dark-input border-2 flex items-center justify-center group transition-all duration-200 ${
              isDragging
                ? 'border-primary dark:border-dark-primary border-dashed scale-105 bg-primary/5 dark:bg-dark-primary/5'
                : 'border-outline-variant dark:border-dark-border border-solid'
            }`}
          >
            {formData.itemImage ? (
              <>
                <img
                  src={
                    formData.itemImage.startsWith('http')
                      ? formData.itemImage
                      : `${import.meta.env.VITE_API_URL || ''}${formData.itemImage}`
                  }
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            ) : uploadingImage ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-on-surface-variant/40 hover:text-primary dark:text-dark-text-muted/40 dark:hover:text-dark-primary transition-colors p-2 text-center select-none">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-label-sm font-bold">Drag & Drop</span>
                <span className="text-[10px] opacity-75">or click to browse</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <Input
            label="Item Code *"
            value={formData.itemCode}
            onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
            placeholder="Unique Item Identifier"
            required
            disabled={isLoading || uploadingImage}
          />
          <Input
            label="Item Name"
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            placeholder="Item Description"
            disabled={isLoading || uploadingImage}
          />
          <div className="md:col-span-2">
            <Input
              label="Fabric Name *"
              value={formData.fabricName}
              onChange={(e) => setFormData({ ...formData, fabricName: e.target.value })}
              placeholder="Fabric Name"
              required
              disabled={isLoading || uploadingImage}
            />
          </div>
        </div>

        <Input
          label="Remark"
          value={formData.remark}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
          placeholder="Optional remarks"
          disabled={isLoading || uploadingImage}
        />
      </form>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading || uploadingImage}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={uploadingImage}
        >
          {item ? 'Update Item' : 'Add Item'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
