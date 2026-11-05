import {
  filterCatalogPermissions,
  hasIdentityRole,
  isPlatformAdmin,
  mergePermissionSets,
} from '#modules/common-platform/services/platform_identity_rbac'
import { ENROLLMENT_PERMISSIONS } from '#modules/enrollment/domain/enums/index'

export const ENROLLMENT_CATALOG = ENROLLMENT_PERMISSIONS.map((p) => p.code)

export const USIS_STUDENT_PACK = [
  'portal.student',
  'students.self',
  'advising.read',
  'grades.read',
  'assessments.read',
  'payments.read',
  'scholarships.read',
  'deficiencies.read',
  'clearance.read',
  'faculty_eval.submit',
  'queue.self',
  'counseling.self',
  'subjects.read',
] as const

export const USIS_ADVISER_PACK = [
  'advising.read',
  'advising.write',
  'grades.read',
  'grades.write',
  'students.read',
] as const

export const USIS_REGISTRAR_PACK = [
  'applicants.read',
  'applicants.write',
  'students.read',
  'students.write',
  'academic.read',
  'academic.write',
  'enrollments.read',
  'enrollments.write',
  'enrollments.override',
  'advising.read',
  'advising.write',
  'grades.read',
  'grades.admin',
  'assessments.read',
  'deficiencies.read',
  'deficiencies.write',
  'clearance.read',
  'announcements.read',
  'announcements.write',
  'faculty_eval.read',
  'faculty_eval.write',
  'reports.read',
  'reports.export',
] as const

export const USIS_CASHIER_PACK = [
  'assessments.read',
  'payments.read',
  'payments.write',
  'clearance.read',
  'students.read',
] as const

export const USIS_RECORDS_OFFICER_PACK = ['students.read', 'enrollments.read'] as const

export const USIS_ADMISSIONS_PACK = ['applicants.read', 'applicants.write'] as const

export const USIS_GUIDANCE_PACK = ['guidance.read', 'guidance.write'] as const

export const USIS_HEALTH_PACK = ['health.read', 'health.write'] as const

export const USIS_OSA_PACK = ['osa.read', 'osa.write'] as const

export const USIS_SCHOLARSHIP_PACK = ['scholarships.read', 'scholarships.write'] as const

export function enrollmentPackForIdentityRole(role: string): readonly string[] {
  switch (role) {
    case 'student':
      return USIS_STUDENT_PACK
    case 'adviser':
      return USIS_ADVISER_PACK
    case 'registrar':
      return USIS_REGISTRAR_PACK
    case 'cashier':
      return USIS_CASHIER_PACK
    case 'records_officer':
      return USIS_RECORDS_OFFICER_PACK
    case 'employee':
      return []
    default:
      return []
  }
}

export function resolveEnrollmentPlatformPermissions(
  platformPermissions: string[],
  roles: string[] = []
): string[] {
  const catalog = ENROLLMENT_CATALOG

  if (isPlatformAdmin(roles, platformPermissions)) {
    return ['*', ...catalog]
  }

  const packs: string[][] = []

  if (hasIdentityRole(roles, 'student')) {
    packs.push([...USIS_STUDENT_PACK])
  }
  if (hasIdentityRole(roles, 'adviser')) {
    packs.push([...USIS_ADVISER_PACK])
  }
  if (hasIdentityRole(roles, 'registrar')) {
    packs.push([...USIS_REGISTRAR_PACK])
  }
  if (hasIdentityRole(roles, 'cashier')) {
    packs.push([...USIS_CASHIER_PACK])
  }
  if (hasIdentityRole(roles, 'records_officer')) {
    packs.push([...USIS_RECORDS_OFFICER_PACK])
  }

  const explicit = filterCatalogPermissions(platformPermissions, catalog)
  for (const code of explicit) {
    if (code.endsWith('.access')) continue
    packs.push([code])
  }

  const merged = mergePermissionSets(...packs)
  if (merged.length > 0) return merged

  if (
    platformPermissions.includes('enrollment.access') ||
    platformPermissions.some((p) => p.startsWith('enrollment.'))
  ) {
    return []
  }

  return merged
}

export function resolveEnrollmentLocalRoleSlug(roles: string[] = []): string {
  if (isPlatformAdmin(roles)) return 'admin'
  if (hasIdentityRole(roles, 'student')) return 'student'
  if (hasIdentityRole(roles, 'registrar')) return 'registrar'
  if (hasIdentityRole(roles, 'adviser')) return 'adviser'
  if (hasIdentityRole(roles, 'cashier')) return 'cashier'
  if (hasIdentityRole(roles, 'records_officer')) return 'records_officer'
  if (hasIdentityRole(roles, 'employee')) return 'employee'
  return 'employee'
}
