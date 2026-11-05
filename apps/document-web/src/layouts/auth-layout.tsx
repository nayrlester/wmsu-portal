import { Outlet } from 'react-router-dom'
import { AuthShowcasePanel } from '@/components/auth/auth-showcase-panel'
import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { SkipLink } from '@/components/shared/skip-link'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4 py-8">
      <SkipLink />
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full wmsu-login-blob-top" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full wmsu-login-blob-bottom" />

      <header className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20">
        <ThemeToggle />
      </header>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white wmsu-login-card-shadow lg:grid-cols-2 animate-fade-up">
        <main
          id="main-content"
          className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14"
        >
          <div className="mb-6 flex justify-center lg:justify-start">
            <BrandLogo />
          </div>
          <Outlet />
        </main>
        <AuthShowcasePanel />
      </div>
    </div>
  )
}
