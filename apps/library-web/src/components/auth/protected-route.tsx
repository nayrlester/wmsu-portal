import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { isStudentAllowedPath, isStudentLimitedAccess } from '@/lib/student-access'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isStudentLimitedAccess(user) && !isStudentAllowedPath(location.pathname)) {
    return <Navigate to="/portal" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  if (isAuthenticated) {
    return <Navigate to={isStudentLimitedAccess(user) ? '/portal' : '/dashboard'} replace />
  }

  return <Outlet />
}
