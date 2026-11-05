import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Student from '#modules/enrollment/models/student'
import { clearanceAggregateService } from '#modules/enrollment/services/clearance_aggregate_service'
import { clearanceReportService } from '#modules/enrollment/services/clearance_report_service'
import { facultyEvalService } from '#modules/enrollment/services/faculty_eval_service'
import { rbacService } from '#modules/enrollment/services/rbac_service'

const issueValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().minLength(3).maxLength(64),
  })
)

export default class ClearanceController {
  async checkClearance({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const studentNumber = params.studentNumber

    const student = await Student.query()
      .where('organization_id', user.organizationId)
      .where('student_number', studentNumber)
      .firstOrFail()

    const checks = await clearanceAggregateService.crossSystemChecks(studentNumber)
    const allCleared = checks.finance.cleared && checks.inventory.cleared && checks.library.cleared

    return response.ok({
      data: {
        student: { id: student.id, studentNumber: student.studentNumber, name: `${student.firstName} ${student.lastName}` },
        cleared: allCleared,
        checks,
      },
    })
  }

  async issueReport(ctx: HttpContext) {
    const user = ctx.auth.user!
    const payload = await ctx.request.validateUsing(issueValidator)
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions)

    const student = await clearanceAggregateService.loadStudent(user.organizationId, payload.studentNumber)
    if (!student) {
      return ctx.response.notFound({ error: 'Student not found' })
    }

    const canAnyStudent =
      permissions.includes('*') ||
      permissions.includes('admin') ||
      permissions.includes('students.read') ||
      permissions.includes('enrollments.read')

    if (!canAnyStudent) {
      const self = await facultyEvalService.resolveStudent(user.organizationId, user.email ?? '')
      if (!self || self.id !== student.id) {
        return ctx.response.forbidden({ error: 'Forbidden' })
      }
    }

    const report = await clearanceReportService.issue({
      organizationId: user.organizationId,
      student,
      issuedByUserId: user.id,
    })

    return ctx.response.created({ data: report })
  }

  async showReport(ctx: HttpContext) {
    const user = ctx.auth.user!
    const row = await clearanceReportService.getForAuthorizedUser(ctx.params.token, user.organizationId)
    if (!row) return ctx.response.notFound({ error: 'Report not found' })
    return ctx.response.ok({ data: row })
  }

  async verifyReport(ctx: HttpContext) {
    const result = await clearanceReportService.verify(ctx.params.token)
    if (!result.valid && 'reason' in result && result.reason === 'not_found') {
      return ctx.response.notFound({ data: result })
    }
    return ctx.response.ok({ data: result })
  }
}
