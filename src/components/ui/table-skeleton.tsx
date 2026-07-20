import React from 'react'

export interface TableSkeletonProps {
  columns?: number
  rows?: number
  showSearch?: boolean
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 6,
  rows = 6,
  showSearch = true,
}) => {
  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Top Header Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low/60 dark:bg-dark-card/60 border border-outline-variant/40 dark:border-dark-border/40">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-300/50 dark:bg-slate-700/50 rounded-lg animate-pulse" />
          <div className="h-3.5 w-64 bg-slate-200/40 dark:bg-slate-800/40 rounded animate-pulse" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showSearch && (
            <div className="h-10 w-full sm:w-64 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl animate-pulse" />
          )}
          <div className="h-10 w-32 bg-primary/20 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Main Table Card Skeleton */}
      <div className="p-6 rounded-2xl bg-surface-container-low/80 dark:bg-dark-card/80 border border-outline-variant/60 dark:border-dark-border/60 space-y-4 shadow-sm">
        {/* Table Header Row */}
        <div className="grid grid-cols-6 gap-4 pb-4 border-b border-outline-variant/50 dark:border-dark-border/50">
          {Array.from({ length: columns }).map((_, idx) => (
            <div
              key={idx}
              className="h-4 bg-slate-300/60 dark:bg-slate-700/60 rounded animate-pulse"
              style={{ width: `${Math.floor(60 + Math.random() * 30)}%` }}
            />
          ))}
        </div>

        {/* Table Rows */}
        <div className="space-y-3 pt-1">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="grid grid-cols-6 gap-4 items-center p-3.5 rounded-xl bg-surface-container-low/40 dark:bg-dark-input/40 border border-outline-variant/30 dark:border-dark-border/30 hover:border-primary/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-300/50 dark:bg-slate-700/50 animate-pulse shrink-0" />
                <div className="h-4 w-28 bg-slate-300/60 dark:bg-slate-700/60 rounded animate-pulse" />
              </div>
              <div className="h-4 w-24 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse" />
              <div className="h-6 w-20 bg-emerald-500/20 rounded-full animate-pulse" />
              <div className="flex justify-end gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
