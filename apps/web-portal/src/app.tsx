import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/auth/protected-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import { LogoutPage } from '@/features/auth/pages/logout-page'
import { SsoCallbackPage } from '@/features/auth/pages/sso-callback-page'
import { LauncherPage } from '@/features/launcher/pages/launcher-page'
import { AdminPage } from '@/features/admin/pages/admin-page'
import { TermsPage } from '@/features/legal/pages/terms-page'
import { PrivacyPage } from '@/features/legal/pages/privacy-page'
import { SupportPage } from '@/features/legal/pages/support-page'
import { SupportChatWidget } from '@/features/support-chat/components/support-chat-widget'
import { HttpNotifyBootstrap } from '@wmsu/ui'

const GuestApplyLandingPage = lazy(() =>
  import('@/features/admissions/pages/guest-apply-landing-page').then((m) => ({
    default: m.GuestApplyLandingPage,
  }))
)
const GuestApplyFormPage = lazy(() =>
  import('@/features/admissions/pages/guest-apply-form-page').then((m) => ({
    default: m.GuestApplyFormPage,
  }))
)
const ApplicantStatusPage = lazy(() =>
  import('@/features/admissions/pages/applicant-status-page').then((m) => ({
    default: m.ApplicantStatusPage,
  }))
)
const GuestExamPage = lazy(() =>
  import('@/features/admissions/pages/guest-exam-page').then((m) => ({
    default: m.GuestExamPage,
  }))
)

function ApplyFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] text-sm text-[var(--color-muted-foreground)]">
      Loading admissions…
    </div>
  )
}

export function App() {
  return (
    <>
      <HttpNotifyBootstrap />
      <BrowserRouter>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/sso/callback" element={<SsoCallbackPage />} />

          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/support" element={<SupportPage />} />

          <Route
            path="/apply"
            element={
              <Suspense fallback={<ApplyFallback />}>
                <GuestApplyLandingPage />
              </Suspense>
            }
          />
          <Route
            path="/apply/start"
            element={
              <Suspense fallback={<ApplyFallback />}>
                <GuestApplyFormPage />
              </Suspense>
            }
          />
          <Route
            path="/apply/status"
            element={
              <Suspense fallback={<ApplyFallback />}>
                <ApplicantStatusPage />
              </Suspense>
            }
          />
          <Route
            path="/apply/exam"
            element={
              <Suspense fallback={<ApplyFallback />}>
                <GuestExamPage />
              </Suspense>
            }
          />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<LauncherPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <SupportChatWidget />
      </BrowserRouter>
    </>
  )
}
