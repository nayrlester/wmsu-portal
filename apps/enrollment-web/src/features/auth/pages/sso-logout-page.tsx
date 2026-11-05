import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { clearQueryCache } from '@/lib/query-client'
import { portalLoginUrl } from '@/lib/portal'

export function SsoLogoutPage() {
  useEffect(() => {
    useAuthStore.getState().logout()
    clearQueryCache()
    try {
      localStorage.removeItem('usis-auth')
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] text-sm text-[var(--color-muted-foreground)]">
      Signing out…
    </div>
  )
}
