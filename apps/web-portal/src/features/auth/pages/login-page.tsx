import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Zap, KeyRound, ShieldCheck } from 'lucide-react'
import { Alert, notifySignInError, useNotification } from '@wmsu/ui'
import { login, fetchMe, verifyMfa } from '@/lib/auth-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

function formatPortalLoginError(apiMsg: string, email: string) {
  const systemAccount = /kiosk-service@internal\.library$/i.test(email.trim())
  if (systemAccount) {
    return `${apiMsg} This is a Library system account and cannot sign in to University Platform Access.`
  }
  if (/identity upstream unavailable/i.test(apiMsg)) {
    return `${apiMsg} Start the Identity API on port 3411 (from WMSU/wmsu-platform: pnpm run dev:identity).`
  }
  return `${apiMsg} Use an Identity account, or a staff account provisioned from HRIS/Library (same email and password). Students see Library, OPAC, and Kiosk.`
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useNotification()
  const setSession = useAuthStore((s) => s.setSession)
  const setTokens = useAuthStore((s) => s.setTokens)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null)
  const sessionReason =
    typeof (location.state as { reason?: unknown } | null)?.reason === 'string'
      ? (location.state as { reason: string }).reason
      : null
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionReason) {
      notifySignInError(
        notify,
        `Session expired. Please sign in again. (${sessionReason})`
      )
    }
  }, [sessionReason, notify])

  async function completeWithTokens(accessToken: string, refreshToken: string) {
    setTokens(accessToken, refreshToken)
    const me = await fetchMe()
    setSession({
      accessToken,
      refreshToken,
      user: me.user,
      roles: me.roles,
      platforms: me.platforms,
    })
    navigate('/')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setLoginError(null)

    try {
      if (mfaChallengeToken) {
        const tokens = await verifyMfa(mfaChallengeToken, mfaCode.trim())
        await completeWithTokens(tokens.accessToken, tokens.refreshToken)
        return
      }

      const result = await login(email.trim(), password)
      if ('mfaRequired' in result && result.mfaRequired) {
        setMfaChallengeToken(result.mfaChallengeToken)
        return
      }
      await completeWithTokens(result.tokens.accessToken, result.tokens.refreshToken)
    } catch (err) {
      const apiMsg = getApiErrorMessage(err)
      const description = formatPortalLoginError(apiMsg, email)
      setLoginError(description)
      notifySignInError(notify, description)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4 py-8">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full wmsu-login-blob-top" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full wmsu-login-blob-bottom" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white wmsu-login-card-shadow animate-fade-up lg:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
          <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <WmsuLogo
              productName="WMSU Portal"
              productTagline="Campus Information Systems"
              variant="auth"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#12122a] sm:text-3xl">
            {mfaChallengeToken ? 'MFA' : 'Sign in'}
          </h1>
          {mfaChallengeToken ? (
            <p className="mt-2 text-sm text-[#6b6f8c]">
              Enter the 6-digit code from your authenticator app.
            </p>
          ) : null}

          <form onSubmit={onSubmit} className={mfaChallengeToken ? 'mt-8 space-y-4' : 'mt-10 space-y-4'}>
            {!mfaChallengeToken ? (
              <>
                <div>
                  <label className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6f8c]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 w-full rounded-full bg-[#f3f4ff] pl-11 pr-4 text-sm text-[#12122a] outline-none ring-[var(--color-primary)]/30 placeholder:text-[#9aa0c3] focus:ring-2"
                      placeholder="Email"
                      autoComplete="username"
                      required
                    />
                  </label>
                </div>

                <div>
                  <label className="relative block">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6f8c]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-full bg-[#f3f4ff] pl-11 pr-11 text-sm text-[#12122a] outline-none ring-[var(--color-primary)]/30 placeholder:text-[#9aa0c3] focus:ring-2"
                      placeholder="Password"
                      autoComplete="current-password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#6b6f8c] hover:text-[#12122a]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </label>
                </div>
              </>
            ) : (
              <div>
                <label className="relative block">
                  <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6f8c]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="h-12 w-full rounded-full bg-[#f3f4ff] pl-11 pr-4 text-sm tracking-[0.3em] text-[#12122a] outline-none ring-[var(--color-primary)]/30 placeholder:text-[#9aa0c3] focus:ring-2"
                    placeholder="000000"
                    autoComplete="one-time-code"
                    required
                    minLength={6}
                    maxLength={8}
                  />
                </label>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-[var(--color-primary)]"
                  onClick={() => {
                    setMfaChallengeToken(null)
                    setMfaCode('')
                  }}
                >
                  Back to password
                </button>
              </div>
            )}

            {loginError ? (
              <Alert variant="danger" title="Sign-in failed">
                {loginError}
              </Alert>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-12 w-full rounded-full wmsu-btn-gradient text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {isSubmitting
                ? 'Signing in…'
                : mfaChallengeToken
                  ? 'Verify MFA'
                  : 'Login Now'}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 text-xs text-[#9aa0c3]">
            <div className="h-px flex-1 bg-[#dde1f5]" />
            <span>University Platform Access Service</span>
            <div className="h-px flex-1 bg-[#dde1f5]" />
          </div>

          <p className="mt-4 text-center text-sm text-[#6b6f8c]">
            Secure single sign-on for university platforms.
          </p>

          <p className="mt-4 text-center text-sm">
            <Link
              to="/apply"
              className="font-medium text-[var(--color-primary)] underline underline-offset-4 transition hover:opacity-90"
            >
              Apply to WMSU
            </Link>
          </p>

          <nav
            className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            aria-label="Legal"
          >
            <Link
              to="/terms"
              className="text-sm font-medium text-[#6b6f8c] transition hover:text-[var(--color-primary)]"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-sm font-medium text-[#6b6f8c] transition hover:text-[var(--color-primary)]"
            >
              Privacy Policy
            </Link>
            <Link
              to="/support"
              className="text-sm font-medium text-[#6b6f8c] transition hover:text-[var(--color-primary)]"
            >
              Support
            </Link>
          </nav>
        </div>

        <div className="relative hidden min-h-[520px] login-wave wmsu-login-hero p-10 lg:block">
          <div className="absolute inset-0 login-wave" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="max-w-xs text-2xl font-semibold leading-snug text-white">
                One gateway for every platform your university runs.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -right-2 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg">
                <Zap className="h-5 w-5 fill-amber-400 text-amber-400" />
              </div>
              <div className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
                <div className="rounded-[1.25rem] wmsu-auth-inner-panel p-5">
                  <div className="flex items-end gap-3">
                    <div className="flex h-28 w-20 items-center justify-center rounded-xl bg-white/15">
                      <KeyRound className="h-10 w-10 text-white/80" />
                    </div>
                    <div className="flex-1 space-y-3 pb-1">
                      <div className="h-3 w-24 rounded-full bg-white/80" />
                      <div className="h-3 w-32 rounded-full bg-white/40" />
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="h-14 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_70%,white)]" />
                        <div className="h-14 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_50%,white)]" />
                        <div className="h-14 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_30%,white)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/65">University Platform Access Service</p>
          </div>
        </div>
      </div>
    </div>
  )
}
