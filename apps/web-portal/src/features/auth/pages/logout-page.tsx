import { useEffect, useState } from 'react'
import { performGlobalLogout } from '@/lib/global-logout'
import { useAuthStore } from '@/stores/auth-store'
import { WmsuLogo } from '@/components/brand/wmsu-logo'
import { Spinner } from '@wmsu/ui'

export function LogoutPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const { accessToken, refreshToken, isAuthenticated } = useAuthStore.getState()
      if (!isAuthenticated && !accessToken && !refreshToken) {
        window.location.replace('/login')
        return
      }
      try {
        await performGlobalLogout({ redirectToLogin: true })
      } catch {
        if (cancelled) return
        useAuthStore.getState().logout()
        setError('Sign-out hit a network issue. Redirecting to login…')
        window.setTimeout(() => window.location.replace('/login'), 600)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e6e9ff] px-4">
      <div className="relative w-full max-w-md rounded-[1.5rem] bg-white p-8 text-center shadow-[0_24px_48px_-28px_rgba(47,42,107,0.45)]">
        <WmsuLogo productName="WMSU Portal" variant="auth" className="mx-auto mb-5 items-center" />
        <Spinner className="mx-auto h-6 w-6" />
        <h1 className="mt-4 text-lg font-semibold text-[#12122a]">Signing out</h1>
        <p className="mt-2 text-sm text-[#6b6f8c]">
          Ending your Identity session and clearing campus platform sign-ins…
        </p>
        {error ? <p className="mt-3 text-sm text-amber-700">{error}</p> : null}
      </div>
    </div>
  )
}
