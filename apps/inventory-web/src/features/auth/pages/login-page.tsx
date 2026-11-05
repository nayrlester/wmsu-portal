import { useLogin } from '@/features/auth/hooks/use-login'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Package, Warehouse, HardDrive, Zap } from 'lucide-react'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

const features = [
  { icon: Package, text: 'Item master, categories, and stock levels' },
  { icon: Warehouse, text: 'Warehouses, bins, and inventory movements' },
  { icon: HardDrive, text: 'Property assets, custodianship, and maintenance' },
] as const

export function LoginPage() {
  const { form, onSubmit, mutation } = useLogin()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4 py-8">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full wmsu-login-blob-top" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full wmsu-login-blob-bottom" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white wmsu-login-card-shadow animate-fade-up lg:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
          <div className="mb-6">
            <WmsuLogo
              productName="UIMS"
              productTagline="Inventory & Property Management"
              variant="auth"
              className="mb-4"
            />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">Sign in</h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Western Mindanao State University · Supply Office
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu.ph"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button
              type="submit"
              className="h-12 w-full wmsu-btn-gradient text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
              {mutation.isPending ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>

        <aside
          className="login-wave relative hidden min-h-[520px] wmsu-login-hero p-10 text-white lg:flex"
          aria-label="Product overview"
        >
          <div className="absolute inset-0 login-wave" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="max-w-xs text-2xl font-semibold leading-snug text-white">
                Supply office tools for stock, warehouses, and property accountability.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -right-2 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg">
                <Zap className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden />
              </div>
              <div className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
                <div className="rounded-[1.25rem] wmsu-auth-inner-panel p-5">
                  <ul className="space-y-3">
                    {features.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex gap-3 text-sm leading-snug text-white/90">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-sm font-medium text-white/90">Receive · Issue · Account</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/65">WMSU · UIMS</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
