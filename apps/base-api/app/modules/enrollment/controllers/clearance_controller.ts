import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Student from '#modules/enrollment/models/student'
import { CLEARANCE_OFFICES } from '#modules/enrollment/domain/office_clearance'
import { clearanceAggregateService } from '#modules/enrollment/services/clearance_aggregate_service'
import { clearanceReportService } from '#modules/enrollment/services/clearance_report_service'
import { officeClearanceService } from '#modules/enrollment/services/office_clearance_service'
import { facultyEvalService } from '#modules/enrollment/services/faculty_eval_service'
import { rbacService } from '#modules/enrollment/services/rbac_service'

const issueValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().minLength(3).maxLength(64),
  })
)

const officeRequirementValidator = vine.compile(
  vine.object({
    office: vine.enum(CLEARANCE_OFFICES),
    requirementCode: vine.string().trim().minLength(2).maxLength(64),
    label: vine.string().trim().minLength(3).maxLength(255),
    autoSource: vine.string().trim().maxLength(64).optional(),
    isActive: vine.boolean().optional(),
    sortOrder: vine.number().optional(),
  })
)

const officeItemAdvanceValidator = vine.compile(
  vine.object({
    status: vine.enum(['pending', 'in_review', 'cleared', 'deficient', 'waived'] as const),
    notes: vine.string().trim().maxLength(1000).optional(),
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

  async listOfficeRequirements({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await officeClearanceService.listRequirements(
      user.organizationId,
      request.input('office') ?? null
    )
    return response.ok({ data })
  }

  async upsertOfficeRequirement({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(officeRequirementValidator)
    const id = await officeClearanceService.upsertRequirement({
      organizationId: user.organizationId,
      office: payload.office,
      requirementCode: payload.requirementCode,
      label: payload.label,
      autoSource: payload.autoSource ?? null,
      isActive: payload.isActive,
      sortOrder: payload.sortOrder,
    })
    return response.ok({ data: { id } })
  }

  async syncStudentOfficeClearance({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await officeClearanceService.syncStudentOfficeClearance({
      organizationId: user.organizationId,
      studentId: params.studentId,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async getStudentOfficeClearance({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await officeClearanceService.getStudentOfficeClearance(
      user.organizationId,
      params.studentId
    )
    return response.ok({ data })
  }

  async advanceOfficeClearanceItem({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(officeItemAdvanceValidator)
    const data = await officeClearanceService.advanceItem({
      organizationId: user.organizationId,
      itemId: params.id,
      status: payload.status,
      notes: payload.notes ?? null,
      actorUserId: user.id,
    })
    return response.ok({ data })
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

  async listReports(ctx: HttpContext) {
    const user = ctx.auth.user!
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions)
    const canAnyStudent =
      permissions.includes('*') ||
      permissions.includes('admin') ||
      permissions.includes('students.read') ||
      permissions.includes('enrollments.read')

    let studentId: string | null = null
    if (!canAnyStudent) {
      const self = await facultyEvalService.resolveStudent(user.organizationId, user.email ?? '')
      if (!self) return ctx.response.forbidden({ error: 'Forbidden' })
      studentId = self.id
    } else if (ctx.request.input('studentNumber')) {
      const student = await clearanceAggregateService.loadStudent(
        user.organizationId,
        String(ctx.request.input('studentNumber'))
      )
      studentId = student?.id ?? null
    }

    const data = await clearanceReportService.listRecent(user.organizationId, {
      studentId,
      limit: Number(ctx.request.input('limit') ?? 30),
    })
    return ctx.response.ok({ data })
  }

  async downloadReportPdf(ctx: HttpContext) {
    const user = ctx.auth.user!
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions)
    const file = await clearanceReportService.pdfPackage(ctx.params.token, user.organizationId)
    if (!file) return ctx.response.notFound({ error: 'Report not found' })

    const canAnyStudent =
      permissions.includes('*') ||
      permissions.includes('admin') ||
      permissions.includes('students.read') ||
      permissions.includes('enrollments.read')
    if (!canAnyStudent) {
      const self = await facultyEvalService.resolveStudent(user.organizationId, user.email ?? '')
      const row = await clearanceReportService.getForAuthorizedUser(ctx.params.token, user.organizationId)
      if (!self || !row || row.snapshot.studentNumber !== self.studentNumber) {
        return ctx.response.forbidden({ error: 'Forbidden' })
      }
    }

    ctx.response.header('Content-Type', file.contentType)
    ctx.response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
    return ctx.response.send(file.body)
  }
}
