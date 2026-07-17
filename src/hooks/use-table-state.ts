import { useState, useEffect } from 'react'

export function useTableState(initialState: {
  page: number
  pageSize: number
  search?: string
  status?: string
  department?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}) {
  const [tableState, setTableState] = useState({
    page: initialState.page,
    pageSize: initialState.pageSize,
    search: initialState.search || '',
    status: initialState.status || '',
    department: initialState.department || '',
    sortBy: initialState.sortBy || 'createdAt',
    sortDir: initialState.sortDir || 'desc',
  })

  const goToPage = (page: number) => {
    setTableState((prev) => ({ ...prev, page }))
  }

  const nextPage = () => {
    setTableState((prev) => ({ ...prev, page: prev.page + 1 }))
  }

  const prevPage = () => {
    setTableState((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
  }

  return { tableState, setTableState, goToPage, nextPage, prevPage }
}