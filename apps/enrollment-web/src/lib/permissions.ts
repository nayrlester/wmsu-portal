import { useAuthStore } from '@/stores/auth-store'

export function usePermissions() {
  return useAuthStore((s) => s.user?.permissions ?? [])
}

export function useHasPermission(...required: string[]) {
  const permissions = usePermissions()
  if (!required.length) return true
  if (permissions.includes('*') || permissions.includes('admin')) return true
  return required.some((code) => permissions.includes(code))
}

export function hasAnyPermission(permissions: string[], required: string[]) {
  if (!required.length) return false
  if (permissions.includes('*') || permissions.includes('admin')) return true
  return required.some((code) => permissions.includes(code))
}

export const USIS_STUDENT_NAV_PERMISSIONS = ['portal.student', 'students.self'] as const

export function hasStudentPortalAccess(permissions: string[], roles: string[]): boolean {
  const roleSlugs = roles.map((r) => r.toLowerCase())
  if (
    roleSlugs.includes('identity_admin') ||
    roleSlugs.includes('admin') ||
    permissions.includes('*') ||
    permissions.includes('admin')
  ) {
    return false
  }
  if (permissions.includes('enrollments.read') || permissions.includes('enrollments.write')) {
    return false
  }
  const studentRole = roleSlugs.some(
    (r) => r === 'student' || r.endsWith('_student')
  )
  if (studentRole) return true
  return USIS_STUDENT_NAV_PERMISSIONS.some((code) => permissions.includes(code))
}

export type PortalId =
  | 'student'
  | 'faculty'
  | 'registrar'
  | 'admissions'
  | 'osa'
  | 'guidance'
  | 'health'
  | 'scholarship'

export function resolveHomePath(permissions: string[], roles: string[]): string {
  const roleSlugs = roles.map((r) => r.toLowerCase())
  if (
    permissions.includes('*') ||
    permissions.includes('admin') ||
    roleSlugs.includes('identity_admin') ||
    roleSlugs.includes('admin')
  ) {
    return '/registrar'
  }
  if (
    permissions.includes('enrollments.read') ||
    permissions.includes('applicants.read') ||
    permissions.includes('academic.write')
  ) {
    return '/registrar'
  }
  if (
    roleSlugs.some((r) => r === 'student' || r.endsWith('_student')) ||
    permissions.includes('students.self') ||
    permissions.includes('portal.student')
  ) {
    return '/student'
  }
  if (permissions.includes('grades.write') && !permissions.includes('enrollments.write')) {
    return '/faculty'
  }
  if (permissions.includes('guidance.write') || permissions.includes('guidance.case_notes.read')) {
    return '/offices/guidance'
  }
  if (permissions.includes('health.write') || permissions.includes('health.clinical.read')) {
    return '/offices/health'
  }
  if (permissions.includes('osa.write')) return '/offices/osa'
  if (permissions.includes('scholarships.write') && !permissions.includes('enrollments.write')) {
    return '/offices/scholarship'
  }
  if (permissions.includes('applicants.write') && !permissions.includes('enrollments.write')) {
    return '/offices/admissions'
  }
  if (permissions.includes('grades.write')) return '/faculty'
  return '/access-denied'
}
