import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'
import { Factory } from 'lucide-react'

export function Layout() {
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  return (
    <div className="min-h-screen bg-background dark:bg-dark-bg">
      <Sidebar />
      <Topbar />
      {/* Desktop: ml-sidebar-width. Mobile: no left margin, but pt-14 for topbar. Desktop has pt-16 only on dashboard page. */}
      <main className={cn(
        "lg:ml-sidebar-width min-h-screen flex flex-col pt-14",
        isDashboard ? "lg:pt-16" : "lg:pt-4"
      )}>
        <div className="mt-0 flex-1">
          <div className="p-3 sm:p-4 lg:p-gutter max-w-container-max mx-auto w-full animate-fade-in">
            <Outlet />
          </div>
        </div>
        <footer className="mt-auto px-4 lg:px-gutter py-6 border-t border-outline-variant/30 dark:border-dark-border/40 bg-surface-container-low/10 dark:bg-dark-hover/5">
          <div className="max-w-container-max mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-on-surface-variant/75 dark:text-dark-text-muted/75">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/10 dark:bg-dark-primary/10 rounded-md flex items-center justify-center text-primary dark:text-dark-primary">
                <Factory className="w-3 h-3" />
              </div>
              <span className="tracking-wide">Mira Creation ERP <span className="opacity-60">v1.0.0</span></span>
            </div>
            
            <p className="text-center sm:text-left tracking-wide opacity-80">
              &copy; {new Date().getFullYear()} Mira Creation. All rights reserved.
            </p>

            <div className="flex items-center gap-2 bg-success-container/30 dark:bg-success/5 px-2.5 py-1 rounded-full border border-success/15">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-bold uppercase tracking-wider">All Systems Operational</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}