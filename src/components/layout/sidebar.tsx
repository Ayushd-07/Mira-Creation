import { LayoutDashboard, Package, Truck, Cog, Group, Settings, Factory, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/lib/services'
import { useState, useEffect } from 'react'

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
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const companyName = settings?.companyName || 'Mira Creation'
  const companyLogo = settings?.logo

  const sidebarContent = (
    <>
      <div className="px-gutter mb-section-gap">
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
          // Hide Settings from non-admin users
          if (item.path === '/settings' && user?.role !== 'admin') return null
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

      <div className="px-4 mt-auto space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low dark:bg-dark-hover/50">
            <div className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-dark-primary/30 flex items-center justify-center text-xs font-bold text-primary dark:text-dark-primary flex-shrink-0">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-md font-medium text-on-surface dark:text-dark-text truncate">{user.name}</p>
              <p className="text-[11px] text-on-surface-variant dark:text-dark-text-muted truncate">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover text-on-surface-variant dark:text-dark-text-muted transition-colors flex-shrink-0" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
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