import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { notifySignInError, useNotification } from '@wmsu/ui'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { bootstrapSuperAdminWorkspace } from '@/shared/lib/tenant-session'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { notify } = useNotification()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.email, data.password)

      if ('mfaRequired' in res && res.mfaRequired) {
        notifySignInError(
          notify,
          'Multi-factor authentication is required by Identity Service. Complete MFA in the Identity portal, then sign in again or use SSO.'
        )
        return
      }

      setAuth(res.user, res.tokens)

      if (res.user.isSuperAdmin) {
        useOnboardingStore.getState().dispatch({ type: 'COMPLETE' })
        bootstrapSuperAdminWorkspace()
        navigate('/app/dashboard', { replace: true })
        return
      }

      const needsOnboarding = useOnboardingStore.getState().needsOnboarding()
      navigate(needsOnboarding ? '/app/onboarding' : '/app/dashboard', { replace: true })
    } catch {
      notifySignInError(notify, 'Invalid email or password')
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">LOGIN</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back. Enter your staff credentials to access the document workspace.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div>
          <label className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              aria-invalid={Boolean(errors.email)}
              className="h-12 w-full rounded-full bg-[var(--color-primary-soft)] pl-11 pr-4 text-sm text-[var(--color-ink)] outline-none ring-primary/30 placeholder:text-[#9aa0c3] focus:ring-2"
              {...register('email')}
            />
          </label>
          {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="relative block">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              className="h-12 w-full rounded-full bg-[var(--color-primary-soft)] pl-11 pr-11 text-sm text-[var(--color-ink)] outline-none ring-primary/30 placeholder:text-[#9aa0c3] focus:ring-2"
              {...register('password')}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-[var(--color-ink)]"
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
    </>
  )
}
