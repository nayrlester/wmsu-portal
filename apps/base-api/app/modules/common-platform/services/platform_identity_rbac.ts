export function normalizeIdentityRoles(roles: string[] = []): string[] {
  return roles.map((r) => r.toLowerCase().trim()).filter(Boolean)
}

export function isPlatformAdmin(roles: string[] = [], platformPermissions: string[] = []): boolean {
  if (platformPermissions.includes('*')) return true
  const normalized = normalizeIdentityRoles(roles)
  return normalized.includes('identity_admin')
}

export function hasIdentityRole(roles: string[] = [], ...codes: string[]): boolean {
  const normalized = normalizeIdentityRoles(roles)
  return codes.some((code) => normalized.includes(code.toLowerCase()))
}

export function primaryIdentityRole(roles: string[] = []): string | null {
  const normalized = normalizeIdentityRoles(roles)
  const priority = [
    'identity_admin',
    'registrar',
    'adviser',
    'cashier',
    'records_officer',
    'employee',
    'student',
  ]
  for (const code of priority) {
    if (normalized.includes(code)) return code
  }
  return normalized[0] ?? null
}

export function mergePermissionSets(...sets: string[][]): string[] {
  const merged = new Set<string>()
  for (const set of sets) {
    for (const code of set) merged.add(code)
  }
  return [...merged]
}

export function filterCatalogPermissions(codes: string[], catalog: string[]): string[] {
  const allowed = new Set(catalog)
  return codes.filter((c) => allowed.has(c))
}

export function hasAppAccess(platformPermissions: string[], appPrefix: string): boolean {
  if (platformPermissions.includes('*')) return true
  return platformPermissions.some(
    (p) => p === `${appPrefix}.access` || p === `${appPrefix}.*` || p.startsWith(`${appPrefix}.`)
  )
}
