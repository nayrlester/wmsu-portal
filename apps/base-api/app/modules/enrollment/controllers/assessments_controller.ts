import type { HttpContext } from '@adonisjs/core/http'
import Assessment from '#modules/enrollment/models/assessment'
import Enrollment from '#modules/enrollment/models/enrollment'
import Student from '#modules/enrollment/models/student'
import { rbacService } from '#modules/enrollment/services/rbac_service'

async function resolveLinkedStudent(organizationId: string, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null
  return Student.query()
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .whereRaw('LOWER(email) = ?', [normalized])
    .first()
}

export default class AssessmentsController {
  async index(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const enrollmentId = request.input('enrollmentId')
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? [])
    const staff =
      permissions.includes('*') ||
      permissions.includes('enrollments.read') ||
      permissions.includes('enrollments.write') ||
      permissions.includes('assessments.write') ||
      permissions.includes('payments.write')

    const query = Assessment.query()
      .where('organization_id', user.organizationId)
      .preload('enrollment')
      .orderBy('created_at', 'desc')

    if (enrollmentId) query.where('enrollment_id', enrollmentId)

    if (!staff) {
      const student = await resolveLinkedStudent(user.organizationId, user.email)
      const enrollmentIds = student
        ? (
            await Enrollment.query()
              .where('organization_id', user.organizationId)
              .where('student_id', student.id)
              .select('id')
          ).map((row) => row.id)
        : []
      query.whereIn(
        'enrollment_id',
        enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000']
      )
    } else if (request.input('studentId')) {
      const enrollmentIds = (
        await Enrollment.query()
          .where('organization_id', user.organizationId)
          .where('student_id', request.input('studentId'))
          .select('id')
      ).map((row) => row.id)
      query.whereIn(
        'enrollment_id',
        enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000']
      )
    }

    const assessments = await query.paginate(page, limit)
    return response.ok({ data: assessments })
  }

  async show({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const assessment = await Assessment.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .preload('enrollment')
      .firstOrFail()

    return response.ok({ data: assessment })
  }
}
