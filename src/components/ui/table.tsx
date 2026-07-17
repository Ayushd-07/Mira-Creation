import { type HTMLAttributes, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode
}

export function Table({ className, children, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto scrollbar-custom">
      <table className={cn('w-full text-left border-collapse table-responsive', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export function TableHead({ className, children, ...props }: TableHeadProps) {
  return (
    <thead
      className={cn('bg-surface-container-low dark:bg-dark-secondary/50', className)}
      {...props}
    >
      {children}
    </thead>
  )
}

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export function TableBody({ className, children, ...props }: TableBodyProps) {
  return (
    <tbody className={cn('divide-y divide-outline-variant/30 dark:divide-dark-border/50', className)} {...props}>
      {children}
    </tbody>
  )
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
}

export function TableRow({ className, children, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'hover:bg-surface-container/50 dark:hover:bg-dark-hover/30 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
}

export function TableHeaderCell({ className, children, ...props }: TableHeaderCellProps) {
  return (
    <th
      className={cn(
        'px-4 py-4 sm:px-gutter sm:py-5 font-label-md text-on-surface-variant dark:text-dark-text-muted uppercase tracking-wider whitespace-nowrap',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
  dataLabel?: string
}

export function TableCell({ className, children, dataLabel, ...props }: TableCellProps) {
  return (
    <td
      data-label={dataLabel}
      className={cn('px-4 py-4 sm:px-gutter sm:py-5 font-body-md text-on-surface dark:text-dark-text', className)}
      {...props}
    >
      {children}
    </td>
  )
}

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  totalEntries: number
  pageSize: number
  onPrevious: () => void
  onNext: () => void
}

export function TablePagination({
  currentPage,
  totalPages,
  totalEntries,
  pageSize,
  onPrevious,
  onNext,
}: TablePaginationProps) {
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalEntries)

  return (
    <div className="px-4 py-4 sm:px-gutter sm:py-4 bg-surface-container-lowest dark:bg-dark-card flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant dark:border-dark-border">
      <span className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
        {start}-{end} of {totalEntries} entries
      </span>
      <div className="flex gap-1">
        <button
          onClick={onPrevious}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg hover:bg-surface-container-low dark:hover:bg-dark-hover text-on-surface-variant dark:text-dark-text-muted transition-colors disabled:opacity-30"
          aria-label="Previous page"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg hover:bg-surface-container-low dark:hover:bg-dark-hover text-on-surface-variant dark:text-dark-text-muted transition-colors disabled:opacity-30"
          aria-label="Next page"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}