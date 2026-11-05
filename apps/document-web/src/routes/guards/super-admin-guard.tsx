import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/auth-store'

export function SuperAdminGuard() {
  const user = useAuthStore((state) => state.user)

  if (!user?.isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
