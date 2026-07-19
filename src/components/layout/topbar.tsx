import { Moon, Sun, Search, Calendar } from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'

export function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''

  if (!isDashboard) {
    return null
  }

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

  return (
    <header className="hidden lg:flex fixed top-0 right-0 w-[calc(100%-var(--sidebar-width))] h-16 bg-surface/80 dark:bg-dark-topbar/80 backdrop-blur-md border-b border-outline-variant dark:border-dark-border z-40 items-center justify-between px-gutter">
      {/* Search Bar - Left Side */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant dark:text-dark-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search dashboard..."
          className="w-full pl-9 pr-4 py-2 bg-surface-container-low dark:bg-dark-hover/20 border border-outline-variant/30 dark:border-dark-border/40 hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-xl text-body-sm text-on-background dark:text-dark-text placeholder:text-on-surface-variant/50 focus:outline-none"
        />
      </div>

      {/* Date Day Widget & Actions - Right Side */}
      <div className="flex items-center gap-stack-lg">
        {/* Date Day Widget */}
        <div className="flex items-center gap-3 px-4 py-1.5 bg-surface-container-low dark:bg-dark-hover/20 border border-outline-variant/30 dark:border-dark-border/40 rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs text-on-background dark:text-dark-text leading-tight">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-on-surface-variant dark:text-dark-text-muted opacity-80 leading-none mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}
            </span>
          </div>
        </div>

        {/* Theme Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full p-0 flex items-center justify-center text-on-surface-variant dark:text-dark-text-muted hover:bg-surface-container dark:hover:bg-dark-hover"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-primary" />
          )}
        </Button>
      </div>
    </header>
  )
}
