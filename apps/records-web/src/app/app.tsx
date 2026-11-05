import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HttpNotifyBootstrap } from '@wmsu/ui'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'
import { AppShell } from '@/components/shell/app-shell'
import { Spinner } from '@/components/ui/spinner'
import { DashboardRouteGuard, RecordsHomeRedirect } from '@/components/routing/records-home'
import { resolveRecordsHomePath } from '@/lib/permissions'

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
const UsersPage = lazy(() =>
  import('@/features/users/pages/users-page').then((m) => ({ default: m.UsersPage }))
)
const RolesPage = lazy(() =>
  import('@/features/roles/pages/roles-page').then((m) => ({ default: m.RolesPage }))
)
const TorRequestsPage = lazy(() =>
  import('@/features/tor/pages/tor-requests-page').then((m) => ({ default: m.TorRequestsPage }))
)
const TorRequestDetailPage = lazy(() =>
  import('@/features/tor/pages/tor-request-detail-page').then((m) => ({
    default: m.TorRequestDetailPage,
  }))
)
const AlumniPage = lazy(() =>
  import('@/features/alumni/pages/alumni-page').then((m) => ({ default: m.AlumniPage }))
)
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/reports-page').then((m) => ({ default: m.ReportsPage }))
)
const CertRequestsPage = lazy(() =>
  import('@/features/certifications/pages/cert-requests-page').then((m) => ({
    default: m.CertRequestsPage,
  }))
)
const CertRequestDetailPage = lazy(() =>
  import('@/features/certifications/pages/cert-request-detail-page').then((m) => ({
    default: m.CertRequestDetailPage,
  }))
)
const PublicVerifyPage = lazy(() =>
  import('@/features/verification/pages/public-verify-page').then((m) => ({
    default: m.PublicVerifyPage,
  }))
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
  const user = useAuthStore((s) => s.user)
  if (token) {
    const home = resolveRecordsHomePath(user?.permissions ?? [], user?.roles ?? [])
    return <Navigate to={home} replace />
  }
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
          <Route
            path="/verify"
            element={
              <Suspense fallback={<PageFallback />}>
                <PublicVerifyPage />
              </Suspense>
            }
          />
          <Route element={<ProtectedLayout />}>
            <Route index element={<RecordsHomeRedirect />} />
            <Route
              path="dashboard"
              element={
                <DashboardRouteGuard>
                  <DashboardPage />
                </DashboardRouteGuard>
              }
            />
            <Route path="tor" element={<TorRequestsPage />} />
            <Route path="tor/:idOrNumber" element={<TorRequestDetailPage />} />
            <Route path="certifications" element={<CertRequestsPage />} />
            <Route path="certifications/:idOrNumber" element={<CertRequestDetailPage />} />
            <Route path="alumni" element={<AlumniPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="foundation" element={<Navigate to="/dashboard" replace />} />
            <Route path="organization" element={<OrganizationPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route
              path="items"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="warehouses" element={<Navigate to="/dashboard" replace />} />
            <Route path="stock" element={<Navigate to="/dashboard" replace />} />
            <Route path="suppliers" element={<Navigate to="/dashboard" replace />} />
            <Route path="requisitions" element={<Navigate to="/dashboard" replace />} />
            <Route path="coa" element={<Navigate to="/dashboard" replace />} />
            <Route path="counts" element={<Navigate to="/dashboard" replace />} />
            <Route path="field" element={<Navigate to="/dashboard" replace />} />
            <Route path="assets" element={<Navigate to="/dashboard" replace />} />
            <Route path="depreciation" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="*" element={<RecordsHomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
