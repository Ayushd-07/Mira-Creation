import { LayoutDashboard, Package, Truck, Cog, Group, Settings, Factory, Menu, X, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/lib/services'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Incoming Stock', icon: Package, path: '/incoming-stock' },
  { label: 'Outgoing Stock', icon: Truck, path: '/outgoing-stock' },
  { label: 'Worker Production', icon: Cog, path: '/worker-production' },
  { label: 'Worker Management', icon: Group, path: '/worker-management' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export function Sidebar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const companyName = settings?.companyName || 'Mira Creation'
  const companyLogo = settings?.logo

  const sidebarContent = (
    <>
      <div className="px-gutter pt-6 mb-section-gap">
        <div className="flex items-center gap-stack-sm">
          <div className="w-10 h-10 bg-primary dark:bg-dark-primary rounded-lg flex items-center justify-center text-on-primary overflow-hidden flex-shrink-0">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
            ) : (
              <Factory className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-headline-md text-headline-md font-bold text-on-background dark:text-dark-text truncate">{companyName}</h1>
            <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted opacity-70">Manufacturing Excellence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-stack-md px-4 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]',
                isActive
                  ? 'bg-surface-container-highest dark:bg-dark-hover text-primary dark:text-dark-primary border-l-4 border-primary dark:border-dark-primary rounded-r-xl font-bold'
                  : 'text-on-surface-variant dark:text-dark-text-muted hover:bg-surface-container dark:hover:bg-dark-hover'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'fill-current dark:fill-dark-primary/30')} />
              <span className="font-body-md text-body-md truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      {user && (
        <div className="p-4 border-t border-outline-variant dark:border-dark-border bg-surface-container-low dark:bg-dark-hover/30 flex items-center justify-between gap-3 mt-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-dark-primary/10 flex items-center justify-center text-primary dark:text-dark-primary font-bold text-label-lg flex-shrink-0">
              {((user.role === 'admin' ? settings?.adminName : '') || user.name).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-body-sm text-on-background dark:text-dark-text truncate leading-tight">
                {user.role === 'admin' ? (settings?.adminName || user.name) : user.name}
              </p>
              <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted truncate capitalize leading-tight">
                {user.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-lg text-danger hover:bg-danger/10 active:scale-95 transition-all"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:flex lg:flex-col fixed h-full w-sidebar-width left-0 top-0 bg-surface dark:bg-dark-sidebar border-r border-outline-variant dark:border-dark-border z-50">
        {sidebarContent}
      </aside>

      {/* Mobile Topbar with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface dark:bg-dark-topbar border-b border-outline-variant dark:border-dark-border z-50 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover text-on-surface dark:text-dark-text"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 bg-primary dark:bg-dark-primary rounded-lg flex items-center justify-center text-on-primary overflow-hidden flex-shrink-0">
            {companyLogo ? (
              <img src={companyLogo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Factory className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="font-headline-md text-headline-md font-bold text-on-background dark:text-dark-text truncate">{companyName}</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-surface dark:bg-dark-sidebar border-r border-outline-variant dark:border-dark-border flex flex-col py-stack-lg animate-slide-in-right overflow-y-auto">
            <div className="flex justify-end px-4 mb-2">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover text-on-surface dark:text-dark-text"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}