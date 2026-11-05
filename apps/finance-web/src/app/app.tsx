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
const OrganizationPage = lazy(() =>
  import('@/features/organization/pages/organization-page').then((m) => ({
    default: m.OrganizationPage,
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
const BudgetPage = lazy(() =>
  import('@/features/budget/pages/budget-page').then((m) => ({ default: m.BudgetPage }))
)
const AccountingPage = lazy(() =>
  import('@/features/accounting/pages/accounting-page').then((m) => ({ default: m.AccountingPage }))
)
const ProcurementPage = lazy(() =>
  import('@/features/procurement/pages/procurement-page').then((m) => ({
    default: m.ProcurementPage,
  }))
)
const PosPage = lazy(() =>
  import('@/features/pos/pages/pos-page').then((m) => ({ default: m.PosPage }))
)
const CashierPage = lazy(() =>
  import('@/features/cashier/pages/cashier-page').then((m) => ({ default: m.CashierPage }))
)
const DisbursementPage = lazy(() =>
  import('@/features/disbursement/pages/disbursement-page').then((m) => ({
    default: m.DisbursementPage,
  }))
)
const ConfigPage = lazy(() =>
  import('@/features/config/pages/config-page').then((m) => ({ default: m.ConfigPage }))
)
const TuitionPage = lazy(() =>
  import('@/features/tuition/pages/tuition-page').then((m) => ({ default: m.TuitionPage }))
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

function RedirectLegacyInventory() {
  return <Navigate to="/dashboard" replace />
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
          <Route
            path="/sso/callback"
            element={
              <Suspense fallback={<PageFallback />}>
                <SsoCallbackPage />
              </Suspense>
            }
          />
          <Route
            path="/sso/logout"
            element={
              <Suspense fallback={<PageFallback />}>
                <SsoLogoutPage />
              </Suspense>
            }
          />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="tuition" element={<TuitionPage />} />
            <Route path="cashier" element={<CashierPage />} />
            <Route path="disbursement" element={<DisbursementPage />} />
            <Route path="procurement" element={<ProcurementPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="config" element={<ConfigPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="organization" element={<OrganizationPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="items" element={<RedirectLegacyInventory />} />
            <Route path="warehouses" element={<RedirectLegacyInventory />} />
            <Route path="stock" element={<RedirectLegacyInventory />} />
            <Route path="suppliers" element={<RedirectLegacyInventory />} />
            <Route path="requisitions" element={<RedirectLegacyInventory />} />
            <Route path="coa" element={<RedirectLegacyInventory />} />
            <Route path="counts" element={<RedirectLegacyInventory />} />
            <Route path="field" element={<RedirectLegacyInventory />} />
            <Route path="assets" element={<RedirectLegacyInventory />} />
            <Route path="depreciation" element={<RedirectLegacyInventory />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
