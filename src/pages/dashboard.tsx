import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Archive, ArrowUpFromLine, Zap, Plus, Truck, Activity, Loader2 } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { IncomingTable, OutgoingTable } from '@/components/dashboard/recent-table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getDashboardStats, createIncoming, createOutgoing, getSettings } from '@/lib/services'
import { formatDate } from '@/lib/utils'
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
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid - All metrics */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <StatCard
              icon={<Archive className="w-5 h-5 fill-current" />}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Incoming Today"
              value={(stats?.incomingToday ?? 0).toLocaleString()}
              unit="batches"
              trend={`${stats?.totalIncoming ?? 0} total`}
              trendColor="text-primary"
              secondaryText={`Total Value: ₹${(stats?.incomingTodayPrice ?? 0).toLocaleString()}`}
            />
            <StatCard
              icon={<ArrowUpFromLine className="w-5 h-5" />}
              iconBg="bg-warning/10"
              iconColor="text-warning"
              label="Outgoing Today"
              value={(stats?.outgoingToday ?? 0).toLocaleString()}
              unit="batches"
              trend={`${stats?.totalOutgoing ?? 0} total`}
              trendColor="text-warning"
              secondaryText={`Total Value: ₹${(stats?.outgoingTodayPrice ?? 0).toLocaleString()}`}
            />
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Production Efficiency"
              value={`${stats?.productionEfficiency ?? 0}%`}
              unit="efficiency"
              trend={stats?.productionEfficiency && stats.productionEfficiency >= 80 ? 'Optimal' : 'Needs attention'}
              trendColor={stats?.productionEfficiency && stats.productionEfficiency >= 80 ? 'text-success' : 'text-warning'}
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