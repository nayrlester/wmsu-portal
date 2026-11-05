import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMe, resolveTenant } from '@/lib/auth-api'
import { useAuthStore } from '@/stores/auth-store'
import { getDefaultTenantSlug } from '@/lib/deployment'
import { apiClient } from '@/lib/api-client'
import { isStudentLimitedAccess } from '@/lib/student-access'
import {
  clearSsoHandoffTokens,
  consumeSsoHandoffTokens,
  ssoErrorMessage,
} from '@/features/auth/lib/sso-handoff'

/**
 * Accepts Identity Service SSO handoff via URL hash fragment.
 * Keeps tokens out of server logs / referrer headers.
 */
export function SsoCallbackPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [error, setError] = useState<string | null>(null)
  const [returnTokens, setReturnTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const tokensFromHandoff = consumeSsoHandoffTokens()

      if (!tokensFromHandoff) {
        setError('Missing SSO tokens. Return to Identity and try again.')
        return
      }

      const { accessToken, refreshToken } = tokensFromHandoff
      setReturnTokens({ accessToken, refreshToken })
      const tokens = {
        accessToken,
        refreshToken,
        expiresIn: '900',
      }

      // Drop any persisted session first — the axios interceptor prefers store
      // tokens over defaults, so a stale Identity JWT here yields
      // `"exp" claim timestamp check failed` on every SSO retry.
      useAuthStore.getState().logout()
      useAuthStore.getState().setTokens(tokens)
      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`

      try {
        const user = await fetchMe()
        const tenantSlug = getDefaultTenantSlug()
        const tenant = await resolveTenant(tenantSlug)
        if (cancelled) return
        clearSsoHandoffTokens()
        setSession(user, tenant, tokens)
        navigate(isStudentLimitedAccess(user) ? '/portal' : '/dashboard', { replace: true })
      } catch (err) {
        if (cancelled) return
        delete apiClient.defaults.headers.common.Authorization
        useAuthStore.getState().logout()
        setError(ssoErrorMessage(err))
      }
    }

    const start = () => {
      void run()
    }

    // Wait for zustand persist hydration so it cannot overwrite fresh SSO tokens.
    if (useAuthStore.persist.hasHydrated()) {
      start()
      return () => {
        cancelled = true
      }
    }

    const unsub = useAuthStore.persist.onFinishHydration(start)
    return () => {
      cancelled = true
      unsub()
    }
  }, [navigate, setSession])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e6e9ff] px-4">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[#b8b3ff]/55" />
      <div className="ui-card max-w-md px-8 py-10 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-[#12122a]">SSO failed</h1>
            <p className="mt-2 text-sm text-[#6b6f8c]">{error}</p>
            <a
              href={portalPlatformsUrl(returnTokens)}
              onClick={() => clearSsoHandoffTokens()}
              className="mt-6 inline-flex rounded-full bg-[#635bff] px-5 py-2 text-sm font-semibold text-white"
            >
              Back to Platforms
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[#12122a]">Signing you in…</h1>
            <p className="mt-2 text-sm text-[#6b6f8c]">
              Completing Identity Service single sign-on.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function portalBaseUrl() {
  return (
    (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim() ||
    'http://127.0.0.1:5173'
  ).replace(/\/$/, '')
}

function portalPlatformsUrl(tokens: { accessToken: string; refreshToken: string } | null) {
  const base = portalBaseUrl()
  if (!tokens?.accessToken || !tokens?.refreshToken) return base
  return `${base}/sso/callback#access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}`
}
