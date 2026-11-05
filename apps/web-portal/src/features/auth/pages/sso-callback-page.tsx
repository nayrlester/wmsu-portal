import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { consumeSsoHandoffTokens, clearSsoHandoffTokens } from '@/features/auth/lib/sso-handoff'
import { fetchMe } from '@/lib/auth-api'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

export function SsoCallbackPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      const tokens = consumeSsoHandoffTokens()
      if (!tokens) {
        setError('No SSO tokens received. Please sign in again.')
        return
      }

      useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)
      apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`

      try {
        const me = await fetchMe()
        if (cancelled) return
        setSession({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: me.user,
          roles: me.roles,
          platforms: me.platforms,
        })
        clearSsoHandoffTokens()
        navigate('/', { replace: true })
      } catch (err) {
        if (cancelled) return
        delete apiClient.defaults.headers.common.Authorization
        useAuthStore.getState().logout()
        clearSsoHandoffTokens()
        setError(getApiErrorMessage(err))
      }
    }

    const run = () => {
      void resolve()
    }

    if (useAuthStore.persist.hasHydrated()) {
      run()
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(run)
      return () => {
        cancelled = true
        unsub()
      }
    }

    return () => {
      cancelled = true
    }
  }, [navigate, setSession])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[#b8b3ff]/55" />
      {error ? (
        <div className="relative w-full max-w-md rounded-[1.5rem] bg-white p-8 text-center shadow-[var(--shadow-soft)] animate-fade-up">
          <WmsuLogo productName="WMSU Portal" variant="auth" className="mx-auto mb-5 items-center" />
          <h2 className="mb-2 text-lg font-semibold text-[#12122a]">SSO Sign-In Failed</h2>
          <p className="mb-5 text-sm text-[#6b6f8c]">{error}</p>
          <Link
            to="/login"
            className="inline-flex h-11 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:brightness-105"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div className="relative text-center animate-fade-up">
          <WmsuLogo productName="WMSU Portal" variant="auth" className="mx-auto mb-5 items-center" />
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          <p className="mt-4 text-sm text-[#6b6f8c]">Returning to Platforms…</p>
        </div>
      )}
    </div>
  )
}
