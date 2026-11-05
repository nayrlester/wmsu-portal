import type { HttpContext } from '@adonisjs/core/http'
import Student from '#modules/enrollment/models/student'
import Enrollment from '#modules/enrollment/models/enrollment'
import { rbacService } from '#modules/enrollment/services/rbac_service'

export async function effectivePermissions(ctx: HttpContext) {
  const user = ctx.auth.user!
  return rbacService.getEffectivePermissions(user, ctx.platformPermissions)
}

export function hasStaffEnrollmentAccess(permissions: string[]) {
  return (
    permissions.includes('*') ||
    permissions.includes('admin') ||
    permissions.includes('enrollments.read') ||
    permissions.includes('students.read')
  )
}

export async function resolveSelfStudent(user: { organizationId: string; email?: string | null }) {
  const email = user.email?.trim().toLowerCase()
  if (!email) return null
  return Student.query()
    .where('organization_id', user.organizationId)
    .whereRaw('LOWER(email) = ?', [email])
    .first()
}

export async function assertEnrollmentVisible(ctx: HttpContext, enrollment: Enrollment) {
  const permissions = await effectivePermissions(ctx)
  if (hasStaffEnrollmentAccess(permissions)) return
  const student = await resolveSelfStudent(ctx.auth.user!)
  if (!student || enrollment.studentId !== student.id) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }
}
