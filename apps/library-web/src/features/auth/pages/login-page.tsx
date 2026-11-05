import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifySignInError, useNotification } from '@wmsu/ui'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react'
import { login, fetchMe, resolveTenant } from '@/lib/auth-api'
import { getApiErrorMessage, apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthTokens, AuthUser } from '@/types/auth'
import {
  allowPublicRegister,
  getAppName,
  getDefaultTenantSlug,
  isUniversityMode,
} from '@/lib/deployment'
import { isStudentLimitedAccess } from '@/lib/student-access'
import { useState } from 'react'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

const universityMode = isUniversityMode()
const defaultTenantSlug = getDefaultTenantSlug()
const appName = getAppName()
const showRegister = allowPublicRegister()

const loginSchema = z.object({
  tenantSlug: universityMode
    ? z.string().optional()
    : z.string().min(2, 'Organization slug is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { notify } = useNotification()
  const setSession = useAuthStore((s) => s.setSession)
  const setTokens = useAuthStore((s) => s.setTokens)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: defaultTenantSlug,
    },
  })

  async function onSubmit(values: LoginForm) {
    const tenantSlug = (values.tenantSlug || defaultTenantSlug).trim().toLowerCase()
    try {
      const result = await login({
        email: values.email,
        password: values.password,
        tenantSlug,
      })
      const data = result as {
        user?: AuthUser
        tokens?: AuthTokens
        mfaRequired?: boolean
      }
      if (data.mfaRequired) {
        notifySignInError(
          notify,
          'MFA is required. Complete sign-in in University Platform Access, then use SSO launch.'
        )
        return
      }
      if (!data.tokens?.accessToken) {
        throw new Error('Login did not return tokens')
      }
      setTokens(data.tokens)
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.tokens.accessToken}`
      const user = data.user ?? (await fetchMe())
      const tenant = await resolveTenant(tenantSlug)
      setSession(user, tenant, data.tokens)
      navigate(isStudentLimitedAccess(user) ? '/portal' : '/dashboard')
    } catch (err) {
      notifySignInError(notify, getApiErrorMessage(err))
    }
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4 py-8">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full wmsu-login-blob-top" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full wmsu-login-blob-bottom" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white wmsu-login-card-shadow animate-fade-up lg:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
          <div className="mb-6">
            <WmsuLogo
              productName="WMSU"
              productTagline="University Library Management"
              variant="auth"
              className="mb-4"
            />
            <h1 className="text-2xl font-bold tracking-tight text-[#12122a] sm:text-3xl">Sign in</h1>
            <p className="mt-2 text-sm text-[#6b6f8c]">
              Welcome back to {appName}. Enter your staff credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {!universityMode && (
              <div>
                <label className="relative block">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6f8c]" />
                  <input
                    className="h-12 w-full rounded-full bg-[#f3f4ff] pl-11 pr-4 text-sm text-[#12122a] outline-none ring-[var(--color-primary)]/30 placeholder:text-[#9aa0c3] focus:ring-2"
                    placeholder="Organization slug"
                    {...register('tenantSlug')}
                  />
                </label>
                {errors.tenantSlug && (
                  <p className="mt-1.5 text-xs text-rose-600">{errors.tenantSlug.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="relative block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6f8c]" />
                <input
                  type="email"
                  className="h-12 w-full rounded-full bg-[#f3f4ff] pl-11 pr-4 text-sm text-[#12122a] outline-none ring-[var(--color-primary)]/30 placeholder:text-[#9aa0c3] focus:ring-2"
                  placeholder="Email"
                  autoComplete="username"
                  {...register('email')}
                />
              </label>
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="relative block">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6f8c]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="h-12 w-full rounded-full bg-[#f3f4ff] pl-11 pr-11 text-sm text-[#12122a] outline-none ring-[var(--color-primary)]/30 placeholder:text-[#9aa0c3] focus:ring-2"
                  placeholder="Password"
                  autoComplete="current-password"
                  {...register('password')}
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
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-12 w-full rounded-full wmsu-btn-gradient text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Login Now'}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 text-xs text-[#9aa0c3]">
            <div className="h-px flex-1 bg-[#dde1f5]" />
            <span>University staff access</span>
            <div className="h-px flex-1 bg-[#dde1f5]" />
          </div>

          <p className="mt-4 text-center text-sm text-[#6b6f8c]">
            Secure email and password sign-in for library staff.
          </p>

          {showRegister && (
            <p className="mt-4 text-center text-sm text-[#6b6f8c]">
              New organization?{' '}
              <Link to="/register" className="font-semibold text-[var(--color-primary)] hover:underline">
                Create account
              </Link>
            </p>
          )}
        </div>

        <div className="relative hidden min-h-[520px] login-wave wmsu-login-hero p-10 lg:block">
          <div className="absolute inset-0 login-wave" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="max-w-xs text-2xl font-semibold leading-snug text-white">
                Quiet tools for a busy university library.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -right-2 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg">
                <Zap className="h-5 w-5 fill-amber-400 text-amber-400" />
              </div>
              <div className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
                <div className="rounded-[1.25rem] wmsu-auth-inner-panel p-5">
                  <div className="flex items-end gap-3">
                    <div className="h-28 w-20 rounded-xl bg-[#f4d7c3]" />
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
                  <p className="mt-5 text-sm font-medium text-white/90">Catalog · Circulate · Discover</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/65">{appName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
