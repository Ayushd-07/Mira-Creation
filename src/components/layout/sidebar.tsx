import { LayoutDashboard, Package, Truck, Cog, Group, Settings, Factory, Menu, X, LogOut, Box, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/lib/services'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Item Master', icon: Box, path: '/item-master' },
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
  const { theme, toggleTheme } = useTheme()

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
      <div className="mx-4 mt-6 mb-6 p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent border border-outline-variant/30 dark:border-dark-border/40 bg-surface-container-low/30 dark:bg-dark-hover/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-primary to-blue-600 dark:from-dark-primary dark:to-blue-500 rounded-xl flex items-center justify-center text-white overflow-hidden flex-shrink-0 ring-2 ring-primary/10 dark:ring-dark-primary/10 shadow-md">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
            ) : (
              <Factory className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-base font-extrabold text-on-background dark:text-dark-text truncate tracking-tight">{companyName}</h1>
            <p className="text-[10px] font-bold text-on-surface-variant dark:text-dark-text-muted opacity-75 tracking-wider mt-0.5 uppercase">Manufacturing</p>
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
                'flex items-center gap-stack-md px-4 py-3 rounded-xl transition-all duration-300 active:scale-[0.98] relative overflow-hidden group border border-transparent',
                isActive
                  ? 'bg-gradient-to-r from-blue-600/90 to-blue-800/90 dark:from-blue-700/80 dark:to-indigo-900/80 text-white font-bold animate-pulse-slow'
                  : 'text-on-surface-variant dark:text-dark-text-muted hover:bg-surface-container/60 dark:hover:bg-dark-hover/50 hover:text-on-surface dark:hover:text-dark-text'
              )}
            >
              {isActive && (
                <span className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-shine pointer-events-none" />
              )}
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105', 
                isActive 
                  ? 'text-white fill-white/10' 
                  : 'opacity-70 group-hover:opacity-100'
              )} />
              <span className="font-body-md text-body-md truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      {user && (
        <div className="mt-auto mx-4 mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-surface-container-low to-surface-container-low/40 dark:from-dark-hover/30 dark:to-dark-hover/10 border border-outline-variant/30 dark:border-dark-border/45 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center text-white font-extrabold text-body-lg flex-shrink-0 shadow-md ring-2 ring-primary/10 dark:ring-dark-primary/10">
              {((user.role === 'admin' ? settings?.adminName : '') || user.name).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-body-sm text-on-background dark:text-dark-text truncate leading-tight">
                {user.role === 'admin' ? (settings?.adminName || user.name) : user.name}
              </p>
              <p className="text-[11px] font-bold text-on-surface-variant/80 dark:text-dark-text-muted/80 truncate capitalize tracking-wide mt-0.5">
                {user.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-danger hover:bg-danger/10 active:scale-90 transition-all border border-transparent hover:border-danger/25 flex-shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
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

        {/* Mobile Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover text-on-surface-variant dark:text-dark-text-muted transition-all active:scale-95"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-primary" />
          )}
        </button>
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