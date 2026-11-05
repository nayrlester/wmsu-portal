import type { HttpContext } from '@adonisjs/core/http'
import GradeEntry from '#modules/enrollment/models/grade_entry'
import { EnrollmentFlowService } from '#modules/enrollment/services/enrollment_flow_service'
import { submitGradesValidator } from '#modules/enrollment/validators/enrollment'
import {
  effectivePermissions,
  hasStaffEnrollmentAccess,
  resolveSelfStudent,
} from '#modules/enrollment/services/enrollment_access_service'
import { resolveStudentGradeStatuses } from '#modules/enrollment/services/academic_policy_runtime_service'

export default class GradesController {
  async index(ctx: HttpContext) {
    const user = ctx.auth.user!
    const page = ctx.request.input('page', 1)
    const limit = ctx.request.input('limit', 20)
    const enrollmentId = ctx.request.input('enrollmentId')

    const query = GradeEntry.query()
      .where('organization_id', user.organizationId)
      .preload('enrollment')
      .orderBy('created_at', 'desc')

    if (enrollmentId) query.where('enrollment_id', enrollmentId)

    const permissions = await effectivePermissions(ctx)
    if (!hasStaffEnrollmentAccess(permissions) && permissions.includes('grades.read')) {
      const student = await resolveSelfStudent(user)
      if (!student) return ctx.response.forbidden({ error: 'Forbidden' })
      query.where('student_id', student.id)
      const visibleStatuses = await resolveStudentGradeStatuses(user.organizationId)
      if (visibleStatuses) query.whereIn('status', visibleStatuses)
    }

    const grades = await query.paginate(page, limit)
    return ctx.response.ok({ data: grades })
  }

  async submit({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(submitGradesValidator)

    const service = new EnrollmentFlowService()
    const entries = await service.submitGrades(payload.enrollmentId, payload.grades, user.id)

    return response.ok({ data: entries })
  }
}
