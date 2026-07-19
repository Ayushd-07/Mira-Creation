import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Package, Truck, Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table'
import { getIncoming, getOutgoing } from '@/lib/services'
import { formatNumber } from '@/lib/utils'

export function IncomingTable() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') || ''

  const { data, isLoading } = useQuery({
    queryKey: ['recent-incoming'],
    queryFn: () => getIncoming({ page: 1, pageSize: 4, sortBy: 'createdAt', sortDir: 'desc' }),
  })
  const recent = data?.data ?? []

  const filteredRecent = recent.filter((entry) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      (entry.srNo && entry.srNo.toLowerCase().includes(searchLower)) ||
      (entry.design && entry.design.toLowerCase().includes(searchLower)) ||
      (entry.fabric && entry.fabric.toLowerCase().includes(searchLower))
    )
  })

  return (
    <Card>
      <CardHeader>
        <h3 className="font-headline-md text-headline-md text-on-background dark:text-dark-text">Recent Incoming</h3>
        <button onClick={() => navigate('/incoming-stock')} className="text-primary font-label-md flex items-center gap-1 hover:underline">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </CardHeader>
      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredRecent.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant dark:text-dark-text-muted">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-body-md">No recent incoming entries found</p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>SR No</TableHeaderCell>
              <TableHeaderCell>Design</TableHeaderCell>
              <TableHeaderCell className="text-right">Pieces</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecent.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="opacity-80 dark:opacity-60" dataLabel="Date">{entry.date}</TableCell>
                  <TableCell className="font-code text-code text-primary" dataLabel="SR No">{entry.srNo}</TableCell>
                  <TableCell dataLabel="Design">{entry.design}</TableCell>
                  <TableCell className="text-right font-bold" dataLabel="Pieces">{formatNumber(entry.pieces)}</TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}

export function OutgoingTable() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') || ''

  const { data, isLoading } = useQuery({
    queryKey: ['recent-outgoing'],
    queryFn: () => getOutgoing({ page: 1, pageSize: 4, sortBy: 'createdAt', sortDir: 'desc' }),
  })
  const recent = data?.data ?? []

  const filteredRecent = recent.filter((entry) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      (entry.srNo && entry.srNo.toLowerCase().includes(searchLower)) ||
      (entry.design && entry.design.toLowerCase().includes(searchLower)) ||
      (entry.fabric && entry.fabric.toLowerCase().includes(searchLower))
    )
  })

  return (
    <Card>
      <CardHeader>
        <h3 className="font-headline-md text-headline-md text-on-background dark:text-dark-text">Recent Outgoing</h3>
        <button onClick={() => navigate('/outgoing-stock')} className="text-warning font-label-md flex items-center gap-1 hover:underline">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </CardHeader>
      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredRecent.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant dark:text-dark-text-muted">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-body-md">No recent outgoing entries found</p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>SR No</TableHeaderCell>
              <TableHeaderCell>Design</TableHeaderCell>
              <TableHeaderCell className="text-right">Pieces</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecent.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="opacity-80 dark:opacity-60" dataLabel="Date">{entry.date}</TableCell>
                  <TableCell className="font-code text-code text-warning" dataLabel="SR No">{entry.srNo}</TableCell>
                  <TableCell dataLabel="Design">{entry.design}</TableCell>
                  <TableCell className="text-right font-bold" dataLabel="Pieces">{formatNumber(entry.pieces)}</TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}