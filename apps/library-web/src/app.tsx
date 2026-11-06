import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpNotifyBootstrap } from '@wmsu/ui'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute, GuestRoute } from '@/components/auth/protected-route'
import { DialogProvider } from '@/components/providers/dialog-provider'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { SsoCallbackPage } from '@/features/auth/pages/sso-callback-page'
import { SsoLogoutPage } from '@/features/auth/pages/sso-logout-page'
import { allowPublicRegister } from '@/lib/deployment'
import { useAuthStore } from '@/stores/auth-store'
import { isStudentLimitedAccess } from '@/lib/student-access'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { UsersPage } from '@/features/users/pages/users-page'
import { SettingsPage } from '@/features/settings/pages/settings-page'
import { BooksPage } from '@/features/books/pages/books-page'
import { BookDetailPage } from '@/features/books/pages/book-detail-page'
import { MembersPage } from '@/features/members/pages/members-page'
import { MemberDetailPage } from '@/features/members/pages/member-detail-page'
import { CirculationPage } from '@/features/circulation/pages/circulation-page'
import { SearchPage } from '@/features/search/pages/search-page'
import { AuditLogsPage } from '@/features/audit/pages/audit-logs-page'
import { ReservationsPage } from '@/features/reservations/pages/reservations-page'
import { ReportsPage } from '@/features/reports/pages/reports-page'
import { NoticeLogPage } from '@/features/notices/pages/notice-log-page'
import { OpacPage } from '@/features/opac/pages/opac-page'
import { PortalPage } from '@/features/portal/pages/portal-page'
import { DigitalPage } from '@/features/digital/pages/digital-page'
import { KioskPlatformPage } from '@/features/kiosk/pages/kiosk-platform-page'
import { RfidPage } from '@/features/rfid/pages/rfid-page'
import { AttendancePage } from '@/features/attendance/pages/attendance-page'
import { IntegrationsPage } from '@/features/integrations/pages/integrations-page'
import { AcquisitionsPage } from '@/features/acquisitions/pages/acquisitions-page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 429 || status === 401 || status === 403) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})

export function App() {
  const user = useAuthStore((s) => s.user)
  const home = isStudentLimitedAccess(user) ? '/portal' : '/dashboard'

  return (
    <QueryClientProvider client={queryClient}>
      <HttpNotifyBootstrap />
      <DialogProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to={home} replace />} />
            <Route path="/sso/callback" element={<SsoCallbackPage />} />
            <Route path="/sso/logout" element={<SsoLogoutPage />} />

            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              {allowPublicRegister() && (
                <Route path="/register" element={<RegisterPage />} />
              )}
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/books/:id" element={<BookDetailPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/members/:id" element={<MemberDetailPage />} />
                <Route path="/circulation" element={<CirculationPage />} />
                <Route path="/acquisitions" element={<AcquisitionsPage />} />
                <Route path="/reservations" element={<ReservationsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/notice-log" element={<NoticeLogPage />} />
                <Route path="/opac" element={<OpacPage />} />
                <Route path="/portal" element={<PortalPage />} />
                <Route path="/digital" element={<DigitalPage />} />
                <Route path="/kiosk-platform" element={<KioskPlatformPage />} />
                <Route path="/rfid" element={<RfidPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </BrowserRouter>
      </DialogProvider>
    </QueryClientProvider>
  )
}
