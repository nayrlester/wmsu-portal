import { Navigate, Outlet } from 'react-router-dom'
import { RouteFallback } from '@/components/shared/route-fallback'
import { useAuthStore } from '@/shared/store/auth-store'

interface PermissionGuardProps {
  permission: string
  fallback?: string
}

export function PermissionGuard({ permission, fallback = '/app/dashboard' }: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const permissionsReady = useAuthStore((state) => state.permissionsReady)
  const isSuperAdmin = useAuthStore((state) => state.user?.isSuperAdmin)

  if (!permissionsReady && !isSuperAdmin) {
    return <RouteFallback />
  }

  if (!hasPermission(permission)) {
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
