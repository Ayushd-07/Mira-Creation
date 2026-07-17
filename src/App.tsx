import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { ThemeProvider } from '@/hooks/use-theme'
import { Layout } from '@/components/layout/layout'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { WorkerManagementPage } from '@/pages/worker-management'
import { IncomingStockPage } from '@/pages/incoming-stock'
import { OutgoingStockPage } from '@/pages/outgoing-stock'
import { WorkerProductionPage } from '@/pages/worker-production'
import { SettingsPage } from '@/pages/settings'
import { ToastContainer } from '@/components/ui/toast'
import { UnauthorizedPage } from '@/pages/unauthorized'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-bg">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
            <ToastContainer />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
