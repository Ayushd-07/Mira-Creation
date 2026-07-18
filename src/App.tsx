import { Routes, Route, BrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/hooks/use-theme'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { Layout } from '@/components/layout/layout'
import { DashboardPage } from '@/pages/dashboard'
import { WorkerManagementPage } from '@/pages/worker-management'
import { IncomingStockPage } from '@/pages/incoming-stock'
import { OutgoingStockPage } from '@/pages/outgoing-stock'
import { WorkerProductionPage } from '@/pages/worker-production'
import { SettingsPage } from '@/pages/settings'
import { ItemMasterPage } from '@/pages/item-master'
import { LoginPage } from '@/pages/login'
import { ForgotPasswordPage } from '@/pages/forgot-password'
import { ResetPasswordPage } from '@/pages/reset-password'
import { ToastContainer } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/error-boundary'

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-bg">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="worker-management" element={<WorkerManagementPage />} />
          <Route path="incoming-stock" element={<IncomingStockPage />} />
          <Route path="item-master" element={<ItemMasterPage />} />
          <Route path="outgoing-stock" element={<OutgoingStockPage />} />
          <Route path="worker-production" element={<WorkerProductionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <AppRoutes />
              <ToastContainer />
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
