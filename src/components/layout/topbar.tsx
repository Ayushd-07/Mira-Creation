import { Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/use-theme'

export function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()


  return (
    <header className="fixed top-0 right-0 w-[calc(100%-theme(spacing.sidebar-width))] h-16 bg-surface/80 dark:bg-dark-topbar/80 backdrop-blur-md border-b border-outline-variant dark:border-dark-border z-40">
      <div className="flex justify-between items-center h-full px-gutter max-w-container-max mx-auto">
        <div className="flex items-center flex-1"></div>

        <div className="flex items-center gap-stack-lg">

        </div>
      </div>
    </header>
  )
}
