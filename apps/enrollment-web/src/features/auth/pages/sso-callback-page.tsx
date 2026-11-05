import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  consumeSsoHandoffTokens,
  ssoErrorMessage,
  clearSsoHandoffTokens,
} from '@/features/auth/lib/sso-handoff'
import { fetchMe } from '@/features/auth/api/auth-api'
import { resolveHomePath } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

type HandoffTokens = { accessToken: string; refreshToken: string }

export function SsoCallbackPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [returnTokens, setReturnTokens] = useState<HandoffTokens | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      const tokens = consumeSsoHandoffTokens()
      if (!tokens) {
        setError('No SSO tokens received. Please try signing in again.')
        return
      }

      setReturnTokens(tokens)
      useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken, 'platform')
      apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`

      try {
        const user = await fetchMe()
        if (cancelled) return
        setAuth(user, tokens.accessToken, tokens.refreshToken, 'platform')
        clearSsoHandoffTokens()
        navigate(resolveHomePath(user.permissions, user.roles), { replace: true })
      } catch (err) {
        if (cancelled) return
        delete apiClient.defaults.headers.common.Authorization
        useAuthStore.getState().logout()
        setError(ssoErrorMessage(err))
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
  }, [navigate, setAuth])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[#b8b3ff]/55" />
      {error ? (
        <div className="relative w-full max-w-md rounded-[1.5rem] bg-white p-8 text-center shadow-[var(--shadow-soft)] animate-fade-up">
          <WmsuLogo productName="USiS" variant="auth" className="mx-auto mb-5 items-center" />
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-ink)]">SSO Sign-In Failed</h2>
          <p className="mb-5 text-sm text-[var(--color-muted-foreground)]">{error}</p>
          <a
            href={portalPlatformsUrl(returnTokens)}
            onClick={() => clearSsoHandoffTokens()}
            className="inline-flex h-11 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
          >
            Back to Platforms
          </a>
        </div>
      ) : (
        <div className="relative text-center animate-fade-up">
          <WmsuLogo productName="USiS" variant="auth" className="mx-auto mb-5 items-center" />
          <Spinner className="mx-auto h-6 w-6" />
          <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">Completing sign-in…</p>
        </div>
      )}
    </div>
  )
}

function portalBaseUrl() {
  return (
    (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim() || 'http://127.0.0.1:5173'
  ).replace(/\/$/, '')
}

function portalPlatformsUrl(tokens: HandoffTokens | null) {
  const base = portalBaseUrl()
  if (!tokens?.accessToken || !tokens?.refreshToken) return base
  return `${base}/sso/callback#access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}`
}
