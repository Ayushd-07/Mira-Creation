import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'

export function Layout() {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-bg">
      <Sidebar />
      {/* Desktop: ml-sidebar-width. Mobile: no left margin, but pt-14 for topbar */}
      <main className="lg:ml-sidebar-width min-h-screen flex flex-col pt-14 lg:pt-0">
        <div className="mt-0 lg:mt-16 flex-1">
          <div className="p-3 sm:p-4 lg:p-gutter max-w-container-max mx-auto w-full animate-fade-in">
            <Outlet />
          </div>
        </div>
        <footer className="p-3 sm:p-4 lg:p-gutter border-t border-outline-variant dark:border-dark-border text-center">
          <p className="font-label-md text-on-surface-variant dark:text-dark-text-muted opacity-70">
            &copy; 2026 Mira Creation Manufacturing System. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  )
}