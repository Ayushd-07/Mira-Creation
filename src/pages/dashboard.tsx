import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Archive, ArrowUpFromLine, Zap, Plus, Truck, Activity, Loader2, Search, Calendar } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { IncomingTable, OutgoingTable } from '@/components/dashboard/recent-table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getDashboardStats, createIncoming, createOutgoing, getSettings } from '@/lib/services'
import { formatDate, cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { getErrorMessage } from '@/lib/api'
import { IncomingModal } from '@/pages/incoming-stock'
import { OutgoingModal } from '@/pages/outgoing-stock'
import { useAuth } from '@/hooks/use-auth'

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getGreetingSubtitle(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Start your day with a clear overview of production, active workers, and incoming stocks.'
  if (hour < 17) return 'Stay on top of today’s active manufacturing operations, shipments, and production progress.'
  return 'Wrap up your day with a final review of today’s production efficiency and logs.'
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false)
  const [isOutgoingModalOpen, setIsOutgoingModalOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const nextParams = new URLSearchParams(searchParams)
    if (val) {
      nextParams.set('search', val)
    } else {
      nextParams.delete('search')
    }
    setSearchParams(nextParams)
  }

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const createIncomingMutation = useMutation({
    mutationFn: createIncoming,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['incoming'] })
      setIsIncomingModalOpen(false)
      toast('success', 'Entry created', 'Incoming stock entry has been added.')
    },
    onError: (error: any) => {
      toast('error', 'Create failed', getErrorMessage(error))
    },
  })

  const createOutgoingMutation = useMutation({
    mutationFn: createOutgoing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['outgoing'] })
      setIsOutgoingModalOpen(false)
      toast('success', 'Entry created', 'Outgoing stock entry has been added.')
    },
    onError: (error: any) => {
      toast('error', 'Create failed', getErrorMessage(error))
    },
  })

  return (
    <div className="space-y-section-gap">
      {/* Welcome Section - Upgraded */}
      <section className="mt-stack-lg animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-display text-on-background dark:text-dark-text">
                {getTimeBasedGreeting()}, {settings?.adminName || user?.name || 'User'}
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-label-md font-medium animate-pulse">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Live
              </span>
            </div>
            <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-dark-text-muted">
              {getGreetingSubtitle()}
            </p>
            <p className="text-label-md text-on-surface-variant/60 dark:text-dark-text-muted/60 mt-1">
              {formatDate(new Date().toISOString())} &middot; Manufacturing Control Center
            </p>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
              <Button variant="secondary" size="md" className="flex-1 sm:flex-none" onClick={() => setIsIncomingModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Incoming
              </Button>
              <Button variant="secondary" size="md" className="flex-1 sm:flex-none" onClick={() => setIsOutgoingModalOpen(true)}>
                <Truck className="w-4 h-4" />
                Add Outgoing
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Searchbar - only visible on screen < lg */}
        <div className="block lg:hidden w-full relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant dark:text-dark-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search dashboard..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low dark:bg-dark-hover/20 border border-outline-variant/35 dark:border-dark-border/40 hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-xl text-body-sm text-on-background dark:text-dark-text placeholder:text-on-surface-variant/50 focus:outline-none"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid - All metrics */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter w-full">
            <StatCard
              icon={<Archive className="w-5 h-5 fill-current" />}
              iconBg="bg-emerald-500/15"
              iconColor="text-emerald-600 dark:text-emerald-400"
              label={<span className="text-emerald-800 dark:text-emerald-300 font-semibold">Incoming Today</span>}
              value={<span className="text-emerald-600 dark:text-emerald-400 font-bold">{(stats?.incomingToday ?? 0).toLocaleString()}</span>}
              unit="batches"
              trend={
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  {stats?.totalIncoming ?? 0} total
                </span>
              }
              secondaryText={
                <div className="space-y-2 mt-3 border-t border-emerald-500/10 pt-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-800/80 dark:text-emerald-400/80 font-medium">Today Value:</span>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold">
                      ₹{(stats?.incomingTodayPrice ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-blue-800/80 dark:text-blue-400/80 font-medium">Total Value:</span>
                    <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold">
                      ₹{(stats?.totalIncomingPrice ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              }
              className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-500/5 dark:shadow-emerald-950/20 hover:border-emerald-500/50 hover:shadow-emerald-500/10 p-6 md:p-8"
            />
            <StatCard
              icon={<ArrowUpFromLine className="w-5 h-5" />}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-600 dark:text-amber-400"
              label={<span className="text-amber-800 dark:text-amber-300 font-semibold">Outgoing Today</span>}
              value={<span className="text-amber-600 dark:text-amber-400 font-bold">{(stats?.outgoingToday ?? 0).toLocaleString()}</span>}
              unit="batches"
              trend={
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                  {stats?.totalOutgoing ?? 0} total
                </span>
              }
              secondaryText={
                <div className="space-y-2 mt-3 border-t border-amber-500/10 pt-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-800/80 dark:text-amber-400/80 font-medium">Today Value:</span>
                    <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold">
                      ₹{(stats?.outgoingTodayPrice ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-rose-800/80 dark:text-rose-400/80 font-medium">Total Value:</span>
                    <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold">
                      ₹{(stats?.totalOutgoingPrice ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              }
              className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30 dark:border-amber-500/20 shadow-amber-500/5 dark:shadow-amber-950/20 hover:border-amber-500/50 hover:shadow-amber-500/10 p-6 md:p-8"
            />
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              iconBg="bg-indigo-500/15"
              iconColor="text-indigo-600 dark:text-indigo-400"
              label={<span className="text-indigo-800 dark:text-indigo-300 font-semibold">Production Efficiency</span>}
              value={<span className="text-indigo-600 dark:text-indigo-400 font-bold">{stats?.productionEfficiency ?? 0}%</span>}
              unit="efficiency"
              trend={
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold",
                  stats?.productionEfficiency && stats.productionEfficiency >= 80
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}>
                  {stats?.productionEfficiency && stats.productionEfficiency >= 80 ? 'Optimal' : 'Needs attention'}
                </span>
              }
              secondaryText={
                <div className="space-y-2 mt-3 border-t border-indigo-500/10 pt-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-indigo-800/80 dark:text-indigo-400/80 font-medium">Pending Work:</span>
                    <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold">
                      {stats?.pendingWork ?? 0} logs
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-sky-800/80 dark:text-sky-400/80 font-medium">Completed Work:</span>
                    <span className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-extrabold">
                      {stats?.completedWork ?? 0} logs
                    </span>
                  </div>
                </div>
              }
              className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent border-indigo-500/30 dark:border-indigo-500/20 shadow-indigo-500/5 dark:shadow-indigo-950/20 hover:border-indigo-500/50 hover:shadow-indigo-500/10 p-6 md:p-8"
            />
          </section>

      {/* Tables Section - Side by Side */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
        <IncomingTable />
        <OutgoingTable />
      </section>

      {/* Quick Add Modals */}
      <IncomingModal
        isOpen={isIncomingModalOpen}
        onClose={() => setIsIncomingModalOpen(false)}
        entry={null}
        onSubmit={(data) => createIncomingMutation.mutate(data)}
        isLoading={createIncomingMutation.isPending}
      />
      <OutgoingModal
        isOpen={isOutgoingModalOpen}
        onClose={() => setIsOutgoingModalOpen(false)}
        entry={null}
        onSubmit={(data) => createOutgoingMutation.mutate(data)}
        isLoading={createOutgoingMutation.isPending}
      />
        </>
      )}
    </div>
  )
}