import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'

/** Redirect new tenants to onboarding until the flow is complete */
export function OnboardingGuard() {
  const location = useLocation()
  const needsOnboarding = useOnboardingStore((state) => state.needsOnboarding)
  const user = useAuthStore((state) => state.user)

  if (user?.isSuperAdmin) {
    return <Outlet />
  }

  if (needsOnboarding() && !location.pathname.startsWith('/app/onboarding')) {
    return <Navigate to="/app/onboarding" replace />
  }

  return <Outlet />
}
