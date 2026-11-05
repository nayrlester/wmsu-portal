import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/modules/auth.api'
import { apiClient } from '@/api/client'
import {
  clearSsoHandoffTokens,
  consumeSsoHandoffTokens,
  ssoErrorMessage,
} from '@/features/auth/lib/sso-handoff'
import { useAuthStore } from '@/stores/auth-store'
import { ROUTES } from '@/shared/constants/env'
import { tokenStorage } from '@/shared/lib/token-storage'
import { APP_BRAND_NAME, APP_LOGO_URL } from '@/shared/constants/branding'

/**
 * Accepts Identity Service SSO handoff via URL hash fragment.
 * Keeps tokens out of server logs and referrer headers.
 */
export function SsoCallbackPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [returnTokens, setReturnTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const handoff = consumeSsoHandoffTokens()

      if (!handoff) {
        setError('Missing SSO tokens. Return to Identity and try again.')
        return
      }

      const { accessToken, refreshToken } = handoff
      setReturnTokens({ accessToken, refreshToken })
      // Persist before profile so interceptors send the Identity JWT (not a stale local token).
      tokenStorage.setTokens(accessToken, refreshToken)
      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`

      try {
        const profile = await authApi.profile()
        if (cancelled) return

        clearSsoHandoffTokens()
        const tokens = {
          accessToken,
          refreshToken,
          expiresIn: 900,
          tokenType: 'Bearer' as const,
        }

        setAuth(
          {
            id: profile.id,
            email: profile.email,
            fullName: profile.fullName,
            tenantId: profile.tenantId,
            isSuperAdmin: profile.isSuperAdmin,
            roles: profile.roles,
          },
          tokens,
          profile.permissions ?? profile.platformPermissions
        )

        navigate(ROUTES.dashboard, { replace: true })
      } catch (err) {
        if (cancelled) return
        tokenStorage.clear()
        delete apiClient.defaults.headers.common.Authorization
        setError(ssoErrorMessage(err))
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [navigate, setAuth])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[#b8b3ff]/55" />
      <div className="ui-card relative w-full max-w-md px-8 py-10 text-center animate-fade-up">
        <div className="mb-5 flex items-center justify-center gap-3">
          <img
            src={APP_LOGO_URL}
            alt="UDMS"
            className="h-14 w-14 rounded-2xl object-contain bg-[#0b1220] p-1 shadow-[var(--shadow-soft)] ring-2 ring-primary/20"
          />
          <div className="text-left">
            <p className="text-lg font-bold tracking-tight text-[var(--color-ink)]">{APP_BRAND_NAME}</p>
            <p className="text-xs text-muted-foreground">UDMS · Identity SSO</p>
          </div>
        </div>
        {error ? (
          <>
            <h1 className="text-xl font-bold text-[var(--color-ink)]">SSO failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <a
              href={portalPlatformsUrl(returnTokens)}
              onClick={() => clearSsoHandoffTokens()}
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
            >
              Back to Platforms
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[var(--color-ink)]">Signing you in…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
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
