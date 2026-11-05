import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Lock, Mail, User } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useTenantStore } from '@/stores/tenant-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'

const schema = z
  .object({
    fullName: z.string().min(2, 'Name is required'),
    organizationName: z.string().min(2, 'Organization name is required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    passwordConfirmation: z.string().min(8),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  })

type FormData = z.infer<typeof schema>

const fieldClass =
  'h-12 w-full rounded-full bg-[var(--color-primary-soft)] pl-11 pr-4 text-sm text-[var(--color-ink)] outline-none ring-primary/30 placeholder:text-[#9aa0c3] focus:ring-2'

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setOrganization = useTenantStore((s) => s.setOrganization)
  const beginOnboarding = useOnboardingStore((s) => s.beginOnboarding)
  const updateDraft = useOnboardingStore((s) => s.updateDraft)
  const dispatch = useOnboardingStore((s) => s.dispatch)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.register(data)
      const tenantId = res.user.tenantId ?? res.tenant.id
      const user = { ...res.user, tenantId }
      setAuth(user, res.tokens)
      setOrganization({
        ...res.tenant,
        status: 'trialing',
        planTier: null,
      })
      beginOnboarding(user)
      updateDraft({
        fullName: data.fullName,
        email: data.email,
        organizationName: data.organizationName,
      })
      dispatch({ type: 'NEXT' })
      navigate('/app/onboarding', { replace: true })
    } catch {
      setError('Registration failed. Email may already be in use.')
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">REGISTER</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create your organization workspace — 14-day free trial, no credit card.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {error && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        <div>
          <label className="relative block">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="fullName"
              autoComplete="name"
              placeholder="Full name"
              className={fieldClass}
              {...register('fullName')}
            />
          </label>
          {errors.fullName && <p className="mt-1.5 text-xs text-rose-600">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="relative block">
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="organizationName"
              placeholder="Organization"
              className={fieldClass}
              {...register('organizationName')}
            />
          </label>
          {errors.organizationName && (
            <p className="mt-1.5 text-xs text-rose-600">{errors.organizationName.message}</p>
          )}
        </div>

        <div>
          <label className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              className={fieldClass}
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
              type="password"
              autoComplete="new-password"
              placeholder="Password"
              className={fieldClass}
              {...register('password')}
            />
          </label>
          {errors.password && <p className="mt-1.5 text-xs text-rose-600">{errors.password.message}</p>}
        </div>

        <div>
          <label className="relative block">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              className={fieldClass}
              {...register('passwordConfirmation')}
            />
          </label>
          {errors.passwordConfirmation && (
            <p className="mt-1.5 text-xs text-rose-600">{errors.passwordConfirmation.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-12 w-full rounded-full wmsu-btn-gradient text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
