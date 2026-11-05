import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HttpNotifyBootstrap, NotificationProvider } from '@wmsu/ui'
import { KioskSelfServicePage } from '@/pages/kiosk-self-service-page'
import { SsoCallbackPage } from '@/pages/sso-callback-page'
import { SsoLogoutPage } from '@/pages/sso-logout-page'

export function App() {
  return (
    <NotificationProvider>
      <HttpNotifyBootstrap />
      <BrowserRouter>
        <Routes>
          <Route path="/sso/callback" element={<SsoCallbackPage />} />
          <Route path="/sso/logout" element={<SsoLogoutPage />} />
          <Route path="/" element={<KioskSelfServicePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  )
}
