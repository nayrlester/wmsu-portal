import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { portalLoginUrl } from '@/lib/portal'

export function SsoLogoutPage() {
  useEffect(() => {
    useAuthStore.getState().logout()
    try {
      localStorage.removeItem('uims-auth')
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
      window.location.replace(next || portalLoginUrl())
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Signing out…
    </div>
  )
}
