import type { AuthUser } from '@/shared/types/auth.types'

/** Tenant Admin / Tenant Owner role slugs (aligned with API DefaultRoleSlug). */
export const ADMIN_ROLE_SLUGS = new Set(['admin', 'tenant_owner', 'super_admin'])

export function isAdminOrSuperAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (user.isSuperAdmin) return true
  return (user.roles ?? []).some((role) => ADMIN_ROLE_SLUGS.has(role.slug))
}
