import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useHasPermission, resolveHomePath } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'

function normalizePath(path: string) {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed || '/'
}

export function RequirePermissionOutlet({
  anyOf,
  allowStudentRole,
}: {
  anyOf: string[]
  allowStudentRole?: boolean
}) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions ?? []
  const roles = user?.roles ?? []
  const allowed = useHasPermission(...anyOf)
  const studentRole = roles.some(
    (r) => r.toLowerCase() === 'student' || r.toLowerCase().endsWith('_student')
  )

  if (!anyOf.length || allowed) return <Outlet />
  if (allowStudentRole && studentRole) return <Outlet />
  if (
    allowStudentRole &&
    (permissions.includes('portal.student') || permissions.includes('students.self'))
  ) {
    return <Outlet />
  }

  const fallback = resolveHomePath(permissions, roles)
  const current = normalizePath(location.pathname)
  const target = normalizePath(fallback)
  if (target === current) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname }} />
  }
  return <Navigate to={fallback} replace />
}
