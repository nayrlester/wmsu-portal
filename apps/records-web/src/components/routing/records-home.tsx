import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { canViewTormsDashboard, resolveRecordsHomePath } from '@/lib/permissions'

export function RecordsHomeRedirect() {
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions ?? []
  const roles = user?.roles ?? []
  const target = resolveRecordsHomePath(permissions, roles)
  return <Navigate to={target} replace />
}

export function DashboardRouteGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions ?? []
  if (!canViewTormsDashboard(permissions)) {
    return <Navigate to={resolveRecordsHomePath(permissions, user?.roles ?? [])} replace />
  }
  return children
}
