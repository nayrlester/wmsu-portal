import { useEffect } from 'react'
import { clearSsoHandoffTokens } from '@/lib/sso-handoff'

const PORTAL_LOGIN =
  (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
  'http://127.0.0.1:5173'

export function SsoLogoutPage() {
  useEffect(() => {
    clearSsoHandoffTokens()
    try {
      localStorage.removeItem('ulmis-kiosk-staff')
      localStorage.removeItem('ulmis-kiosk-session')
      sessionStorage.removeItem('identity_sso_handoff')
    } catch {
      /* ignore */
    }

    try {
      window.parent?.postMessage({ type: 'wmsu-sso-logout-done' }, '*')
    } catch {
      /* ignore */
    }

    const next = new URLSearchParams(window.location.search).get('next')
    if (window.top === window.self) {
      window.location.replace(next || `${PORTAL_LOGIN}/login`)
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Signing out…
    </div>
  )
}
