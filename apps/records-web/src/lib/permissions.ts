export function hasPermission(permissions: string[], code: string) {
  if (permissions.includes('*')) return true
  return permissions.includes(code)
}

export function canViewTormsDashboard(permissions: string[]) {
  return hasPermission(permissions, 'torms.dashboard.read')
}

export function resolveRecordsHomePath(permissions: string[], roles: string[] = []) {
  if (canViewTormsDashboard(permissions)) return '/dashboard'
  if (hasPermission(permissions, 'torms.requests.read') || hasPermission(permissions, 'torms.requests.write')) {
    return '/tor'
  }
  if (roles.some((r) => r === 'student' || r.endsWith('_student'))) return '/tor'
  return '/tor'
}
