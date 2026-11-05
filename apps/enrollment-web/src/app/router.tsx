import { Navigate, Outlet } from 'react-router-dom'
import { resolveHomePath } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'

export function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <Outlet />
}

export function GuestRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  if (accessToken) {
    return <Navigate to={resolveHomePath(user?.permissions ?? [], user?.roles ?? [])} replace />
  }
  return <Outlet />
}

export function DefaultRedirect() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  if (!accessToken) return <Navigate to="/login" replace />
  return <Navigate to={resolveHomePath(user?.permissions ?? [], user?.roles ?? [])} replace />
}
