import type { AuthUser } from '@/types/auth'

/**
 * Platform students / limited members in ULMIS staff web.
 * They may only use self-service (My Library portal) — not staff desks.
 */
export function isStudentLimitedAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (user.roles?.some((r) => r.toLowerCase() === 'student')) return true
  if (user.permissions.includes('library.member')) return true
  if (
    user.permissions.includes('portal:access') &&
    !user.permissions.includes('members:read') &&
    !user.permissions.includes('borrowings:checkout') &&
    !user.permissions.includes('users:read')
  ) {
    return true
  }
  return false
}

export const STUDENT_ALLOWED_PATHS = ['/portal', '/digital', '/search', '/opac'] as const

export function isStudentAllowedPath(pathname: string): boolean {
  return STUDENT_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}
