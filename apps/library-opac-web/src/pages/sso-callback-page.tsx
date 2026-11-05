import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getApiBaseUrl, getDefaultTenantSlug } from '@librastack/client-config'
import {
  clearSsoHandoffTokens,
  consumeSsoHandoffTokens,
  ssoErrorMessage,
} from '@/lib/sso-handoff'
import { useOpacSessionStore } from '@/stores/opac-session-store'

/**
 * Accepts Identity Service SSO handoff via URL hash fragment for OPAC.
 */
export function SsoCallbackPage() {
  const navigate = useNavigate()
  const setSession = useOpacSessionStore((s) => s.setSession)
  const clear = useOpacSessionStore((s) => s.clear)
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

      try {
        const { data } = await axios.get(`${getApiBaseUrl()}/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'X-Tenant-Slug': getDefaultTenantSlug(),
          },
          timeout: 20_000,
        })

        const user = data?.data?.user
        if (!user?.email) {
          throw new Error('Library SSO profile was empty')
        }

        if (cancelled) return
        clearSsoHandoffTokens()
        setSession({
          accessToken,
          refreshToken,
          email: String(user.email),
          fullName: String(user.fullName ?? user.email),
        })
        navigate('/', { replace: true })
      } catch (err) {
        if (cancelled) return
        clear()
        setError(ssoErrorMessage(err))
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [navigate, setSession, clear])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e6e9ff] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 px-8 py-10 text-center shadow-xl">
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
              Completing Identity Service single sign-on for ULMIS OPAC.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function portalPlatformsUrl(tokens: { accessToken: string; refreshToken: string } | null) {
  const base =
    (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
    'http://127.0.0.1:5173'
  if (!tokens?.accessToken || !tokens?.refreshToken) return base
  return `${base}/sso/callback#access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}`
}
