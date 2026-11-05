import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/auth/protected-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import { SsoCallbackPage } from '@/features/auth/pages/sso-callback-page'
import { LauncherPage } from '@/features/launcher/pages/launcher-page'
import { AdminPage } from '@/features/admin/pages/admin-page'
import { TermsPage } from '@/features/legal/pages/terms-page'
import { PrivacyPage } from '@/features/legal/pages/privacy-page'
import { SupportPage } from '@/features/legal/pages/support-page'
import { SupportChatWidget } from '@/features/support-chat/components/support-chat-widget'
import { HttpNotifyBootstrap } from '@wmsu/ui'

export function App() {
  return (
    <>
      <HttpNotifyBootstrap />
      <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/sso/callback" element={<SsoCallbackPage />} />

        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/support" element={<SupportPage />} />

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
