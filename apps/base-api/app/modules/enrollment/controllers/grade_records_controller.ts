import type { HttpContext } from '@adonisjs/core/http'
import { GradeRecordsService } from '#modules/enrollment/services/grade_records_service'
import GradingScheme from '#modules/enrollment/models/grading_scheme'
import GradeDeadline from '#modules/enrollment/models/grade_deadline'
import ClassRecord from '#modules/enrollment/models/class_record'
import GradeCorrectionRequest from '#modules/enrollment/models/grade_correction_request'
import GradeEntryHistory from '#modules/enrollment/models/grade_entry_history'
import Student from '#modules/enrollment/models/student'
import { rbacService } from '#modules/enrollment/services/rbac_service'
import {
  gradingSchemeValidator,
  gradeDeadlineValidator,
  facultyAssignValidator,
  openClassRecordValidator,
  encodeGradesValidator,
  submitClassGradesValidator,
  correctionRequestValidator,
  correctionDecideValidator,
  attendanceValidator,
} from '#modules/enrollment/validators/grades'

export default class GradeRecordsController {
  async upsertScheme({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(gradingSchemeValidator)
    const service = new GradeRecordsService()
    const row = await service.upsertGradingScheme({
      organizationId: user.organizationId,
      ...payload,
    })
    return response.created({ data: row })
  }

  async listSchemes({ response, auth }: HttpContext) {
    const user = auth.user!
    const rows = await GradingScheme.query()
      .where('organization_id', user.organizationId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('code', 'asc')
    return response.ok({ data: rows })
  }

  async upsertDeadline({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(gradeDeadlineValidator)
    const service = new GradeRecordsService()
    const row = await service.upsertGradeDeadline({
      organizationId: user.organizationId,
      setBy: user.id,
      ...payload,
    })
    return response.ok({ data: row })
  }

  async listDeadlines({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = GradeDeadline.query().where('organization_id', user.organizationId)
    if (request.input('academicYearId')) q.where('academic_year_id', request.input('academicYearId'))
    return response.ok({ data: await q.orderBy('semester', 'asc') })
  }

  async assignFaculty({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(facultyAssignValidator)
    const service = new GradeRecordsService()
    const row = await service.assignFaculty({
      organizationId: user.organizationId,
      assignedBy: user.id,
      ...payload,
    })
    return response.created({ data: row })
  }

  async myAssignments({ response, auth }: HttpContext) {
    const user = auth.user!
    const service = new GradeRecordsService()
    const rows = await service.listFacultyAssignments(user.organizationId, user.id)
    return response.ok({ data: rows })
  }

  async openClassRecord({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(openClassRecordValidator)
    const service = new GradeRecordsService()
    const data = await service.openOrSyncClassRecord({
      organizationId: user.organizationId,
      facultyUserId: user.id,
      ...payload,
    })
    return response.ok({ data })
  }

  async classMasterList({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new GradeRecordsService()
    const data = await service.getClassMasterList(user.organizationId, params.id)
    return response.ok({ data })
  }

  async encode({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(encodeGradesValidator)
    const service = new GradeRecordsService()
    const rows = await service.encodeGrades({
      organizationId: user.organizationId,
      facultyUserId: user.id,
      ...payload,
    })
    return response.ok({ data: rows })
  }

  async submit({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(submitClassGradesValidator)
    const service = new GradeRecordsService()
    const data = await service.submitClassGrades({
      organizationId: user.organizationId,
      facultyUserId: user.id,
      ...payload,
    })
    return response.ok({ data })
  }

  async requestCorrection({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(correctionRequestValidator)
    const service = new GradeRecordsService()
    const row = await service.requestCorrection({
      organizationId: user.organizationId,
      requestedBy: user.id,
      ...payload,
    })
    return response.created({ data: row })
  }

  async decideCorrection({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(correctionDecideValidator)
    const service = new GradeRecordsService()
    const data = await service.decideCorrection({
      organizationId: user.organizationId,
      requestId: params.id,
      actorUserId: user.id,
      ...payload,
    })
    return response.ok({ data })
  }

  async listCorrections({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = GradeCorrectionRequest.query().where('organization_id', user.organizationId)
    if (request.input('status')) q.where('status', request.input('status'))
    return response.ok({ data: await q.orderBy('created_at', 'desc') })
  }

  async entryHistory({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const rows = await GradeEntryHistory.query()
      .where('organization_id', user.organizationId)
      .where('grade_entry_id', params.id)
      .orderBy('created_at', 'asc')
    return response.ok({ data: rows })
  }

  async gradeReport({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new GradeRecordsService()
    const data = await service.gradeReport(user.organizationId, params.id)
    return response.ok({ data })
  }

  async exportGradeReport(ctx: HttpContext) {
    const user = ctx.auth.user!
    const format = String(ctx.request.input('format', 'pdf')).toLowerCase()
    if (!['csv', 'xlsx', 'pdf'].includes(format)) {
      return ctx.response.badRequest({ error: 'format must be csv, xlsx, or pdf' })
    }
    try {
      const service = new GradeRecordsService()
      const file = await service.exportGradeReport({
        organizationId: user.organizationId,
        classRecordId: ctx.params.id,
        format: format as 'csv' | 'xlsx' | 'pdf',
        actorUserId: user.id,
      })
      ctx.response.header('Content-Type', file.contentType)
      ctx.response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
      return ctx.response.send(file.body)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      const status = (err as { status?: number })?.status
      if (status === 404) return ctx.response.notFound({ error: message })
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async studentAcademicRecords(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.user!
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? [])
    const staff =
      permissions.includes('*') ||
      permissions.includes('students.read') ||
      permissions.includes('enrollments.read')
    if (!staff && permissions.includes('students.self')) {
      const self = await Student.query()
        .where('organization_id', user.organizationId)
        .whereRaw('LOWER(email) = ?', [user.email?.trim().toLowerCase() ?? ''])
        .first()
      if (!self || self.id !== params.studentId) {
        return response.forbidden({ error: 'Forbidden' })
      }
    }
    const service = new GradeRecordsService()
    const data = await service.academicRecordsForStudent(user.organizationId, params.studentId)
    return response.ok({ data })
  }

  async computeGwa({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new GradeRecordsService()
    const data = await service.computeGwa(
      user.organizationId,
      params.studentId,
      request.input('academicYearId'),
      request.input('semester') ? Number(request.input('semester')) : undefined
    )
    return response.ok({ data })
  }

  async convertIncompletes({ response, auth }: HttpContext) {
    const user = auth.user!
    const service = new GradeRecordsService()
    const data = await service.convertExpiredIncompletes(user.organizationId, user.id)
    return response.ok({ data })
  }

  async recordAttendance({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(attendanceValidator)
    const service = new GradeRecordsService()
    const row = await service.recordAttendance({
      organizationId: user.organizationId,
      recordedBy: user.id,
      ...payload,
    })
    return response.ok({ data: row })
  }

  async listClassRecords({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = ClassRecord.query().where('organization_id', user.organizationId)
    if (request.input('academicYearId')) q.where('academic_year_id', request.input('academicYearId'))
    if (request.input('semester')) q.where('semester', request.input('semester'))
    if (request.input('facultyUserId')) q.where('faculty_user_id', request.input('facultyUserId'))
    return response.ok({ data: await q.orderBy('created_at', 'desc') })
  }
}
