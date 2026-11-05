import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { register as registerApi } from '@/lib/auth-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

const registerSchema = z.object({
  tenantName: z.string().min(2, 'Organization name is required'),
  tenantSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens'),
  tenantType: z.enum([
    'school',
    'university',
    'public_library',
    'corporate',
    'government',
  ]),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenantType: 'school',
    },
  })

  async function onSubmit(values: RegisterForm) {
    setError(null)
    try {
      const result = await registerApi(values)
      setSession(result.user, result.tenant, result.tokens)
      navigate('/dashboard')
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-canvas)] p-4">
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#b8b3ff]/45" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/70" />
      <Card className="relative w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
            <Library className="h-6 w-6" />
          </div>
          <CardTitle>Create your library</CardTitle>
          <CardDescription>Register your organization and admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tenantName">Organization name</Label>
              <Input id="tenantName" placeholder="Lincoln High School" {...register('tenantName')} />
              {errors.tenantName && (
                <p className="text-sm text-red-600">{errors.tenantName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">URL slug</Label>
              <Input id="tenantSlug" placeholder="lincoln-high" {...register('tenantSlug')} />
              {errors.tenantSlug && (
                <p className="text-sm text-red-600">{errors.tenantSlug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantType">Institution type</Label>
              <select
                id="tenantType"
                className="flex h-11 w-full rounded-full border-0 bg-[var(--color-primary-soft)] px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/35"
                {...register('tenantType')}
              >
                <option value="school">School</option>
                <option value="university">University</option>
                <option value="public_library">Public Library</option>
                <option value="corporate">Corporate</option>
                <option value="government">Government</option>
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Your full name</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full sm:col-span-2" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create organization'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
