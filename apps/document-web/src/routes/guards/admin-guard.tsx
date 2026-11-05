import { Navigate, Outlet } from 'react-router-dom'
import { RouteFallback } from '@/components/shared/route-fallback'
import { useAuthStore } from '@/shared/store/auth-store'
import { isAdminOrSuperAdmin } from '@/shared/lib/admin-access'

interface AdminGuardProps {
  fallback?: string
}

/** Route guard for tenant Admin / Tenant Owner / platform Super Admin only. */
export function AdminGuard({ fallback = '/app/dashboard' }: AdminGuardProps) {
  const user = useAuthStore((state) => state.user)
  const permissionsReady = useAuthStore((state) => state.permissionsReady)
  const isSuperAdmin = user?.isSuperAdmin

  if (!permissionsReady && !isSuperAdmin) {
    return <RouteFallback />
  }

  if (!isAdminOrSuperAdmin(user)) {
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
