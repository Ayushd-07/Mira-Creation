import { Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'

export function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-theme(spacing.sidebar-width))] h-16 bg-surface/80 dark:bg-dark-topbar/80 backdrop-blur-md border-b border-outline-variant dark:border-dark-border z-40">
      <div className="flex justify-between items-center h-full px-gutter max-w-container-max mx-auto">
        <div className="flex items-center flex-1"></div>

        <div className="flex items-center gap-stack-lg">
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
      </div>
    </header>
  )
}
