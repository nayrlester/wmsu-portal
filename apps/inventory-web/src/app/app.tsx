import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HttpNotifyBootstrap } from '@wmsu/ui'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'
import { AppShell } from '@/components/shell/app-shell'
import { Spinner } from '@/components/ui/spinner'

const LoginPage = lazy(() =>
  import('@/features/auth/pages/login-page').then((m) => ({ default: m.LoginPage }))
)
const SsoCallbackPage = lazy(() =>
  import('@/features/auth/pages/sso-callback-page').then((m) => ({ default: m.SsoCallbackPage }))
)
const SsoLogoutPage = lazy(() =>
  import('@/features/auth/pages/sso-logout-page').then((m) => ({ default: m.SsoLogoutPage }))
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard-page').then((m) => ({ default: m.DashboardPage }))
)
const ItemsPage = lazy(() =>
  import('@/features/items/pages/items-page').then((m) => ({ default: m.ItemsPage }))
)
const WarehousesPage = lazy(() =>
  import('@/features/warehouses/pages/warehouses-page').then((m) => ({ default: m.WarehousesPage }))
)
const StockPage = lazy(() =>
  import('@/features/stock/pages/stock-page').then((m) => ({ default: m.StockPage }))
)
const AssetsPage = lazy(() =>
  import('@/features/assets/pages/assets-page').then((m) => ({ default: m.AssetsPage }))
)
const OrganizationPage = lazy(() =>
  import('@/features/organization/pages/organization-page').then((m) => ({
    default: m.OrganizationPage,
  }))
)
const SuppliersPage = lazy(() =>
  import('@/features/suppliers/pages/suppliers-page').then((m) => ({ default: m.SuppliersPage }))
)
const RequisitionsPage = lazy(() =>
  import('@/features/requisitions/pages/requisitions-page').then((m) => ({
    default: m.RequisitionsPage,
  }))
)
const CoaPage = lazy(() =>
  import('@/features/coa/pages/coa-page').then((m) => ({ default: m.CoaPage }))
)
const CountsPage = lazy(() =>
  import('@/features/counts/pages/counts-page').then((m) => ({ default: m.CountsPage }))
)
const FieldPage = lazy(() =>
  import('@/features/field/pages/field-page').then((m) => ({ default: m.FieldPage }))
)
const DepreciationPage = lazy(() =>
  import('@/features/depreciation/pages/depreciation-page').then((m) => ({
    default: m.DepreciationPage,
  }))
)
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/reports-page').then((m) => ({ default: m.ReportsPage }))
)
const UsersPage = lazy(() =>
  import('@/features/users/pages/users-page').then((m) => ({ default: m.UsersPage }))
)
const RolesPage = lazy(() =>
  import('@/features/roles/pages/roles-page').then((m) => ({ default: m.RolesPage }))
)

function PageFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="h-6 w-6" />
      <span className="sr-only">Loading page</span>
    </div>
  )
}

function ProtectedLayout() {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (token) return <Navigate to="/dashboard" replace />
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HttpNotifyBootstrap />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route path="/sso/callback" element={<Suspense fallback={<PageFallback />}><SsoCallbackPage /></Suspense>} />
          <Route path="/sso/logout" element={<Suspense fallback={<PageFallback />}><SsoLogoutPage /></Suspense>} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="warehouses" element={<WarehousesPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="requisitions" element={<RequisitionsPage />} />
            <Route path="coa" element={<CoaPage />} />
            <Route path="counts" element={<CountsPage />} />
            <Route path="field" element={<FieldPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="depreciation" element={<DepreciationPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="organization" element={<OrganizationPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
