import { Routes, Route, BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/hooks/use-theme'
import { Layout } from '@/components/layout/layout'
import { DashboardPage } from '@/pages/dashboard'
import { WorkerManagementPage } from '@/pages/worker-management'
import { IncomingStockPage } from '@/pages/incoming-stock'
import { OutgoingStockPage } from '@/pages/outgoing-stock'
import { WorkerProductionPage } from '@/pages/worker-production'
import { SettingsPage } from '@/pages/settings'
import { ToastContainer } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/error-boundary'

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Layout />}
      >
        <Route index element={<DashboardPage />} />
        <Route path="worker-management" element={<WorkerManagementPage />} />
        <Route path="incoming-stock" element={<IncomingStockPage />} />
        <Route path="outgoing-stock" element={<OutgoingStockPage />} />
        <Route path="worker-production" element={<WorkerProductionPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AppRoutes />
            <ToastContainer />
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
