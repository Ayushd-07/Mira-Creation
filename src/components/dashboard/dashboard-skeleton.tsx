import React from 'react'
import { Card } from '@/components/ui/card'

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-gutter w-full animate-fade-in">
      {/* Top Welcome Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-container-low/60 dark:bg-dark-card/60 border border-outline-variant/50 dark:border-dark-border/50">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-300/40 dark:bg-slate-700/40 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-slate-200/40 dark:bg-slate-800/40 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-32 bg-slate-300/40 dark:bg-slate-700/40 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-slate-300/40 dark:bg-slate-700/40 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 3 Stat Cards Grid Skeleton */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter w-full">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="p-6 md:p-8 rounded-2xl bg-surface-container-low/80 dark:bg-dark-card/80 border border-outline-variant/60 dark:border-dark-border/60 space-y-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 w-28 bg-slate-300/50 dark:bg-slate-700/50 rounded animate-pulse" />
                <div className="h-9 w-24 bg-slate-300/70 dark:bg-slate-600/70 rounded-lg animate-pulse" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-300/40 dark:bg-slate-700/40 animate-pulse" />
            </div>

            <div className="pt-3 border-t border-outline-variant/40 dark:border-dark-border/40 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-20 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-300/50 dark:bg-slate-700/50 rounded animate-pulse" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-20 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-300/50 dark:bg-slate-700/50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 2 Tables Skeleton */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
        {[1, 2].map((tblIdx) => (
          <Card key={tblIdx} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/50 dark:border-dark-border/50">
              <div className="h-6 w-36 bg-slate-300/50 dark:bg-slate-700/50 rounded animate-pulse" />
              <div className="h-8 w-24 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg animate-pulse" />
            </div>

            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5].map((rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low/40 dark:bg-dark-input/40 border border-outline-variant/30 dark:border-dark-border/30"
                >
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-300/50 dark:bg-slate-700/50 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-slate-200/40 dark:bg-slate-800/40 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-slate-300/50 dark:bg-slate-700/50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </div>
  )
}
