import type { HttpContext } from '@adonisjs/core/http'
import Assessment from '#modules/enrollment/models/assessment'
import AssessmentLine from '#modules/enrollment/models/assessment_line'
import AssessmentAidTag from '#modules/enrollment/models/assessment_aid_tag'
import FeeSchedule from '#modules/enrollment/models/fee_schedule'
import FinanceIntegrationTransaction from '#modules/enrollment/models/finance_integration_transaction'
import RegistrationDocument from '#modules/enrollment/models/registration_document'
import Enrollment from '#modules/enrollment/models/enrollment'
import Student from '#modules/enrollment/models/student'
import { AssessmentService } from '#modules/enrollment/services/assessment_service'
import { rbacService } from '#modules/enrollment/services/rbac_service'
import {
  feeScheduleValidator,
  prepareAssessmentValidator,
  aidTagValidator,
  issueDocumentValidator,
} from '#modules/enrollment/validators/assessment_finance'

async function resolveLinkedStudent(organizationId: string, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null
  return Student.query()
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .whereRaw('LOWER(email) = ?', [normalized])
    .first()
}

export default class AssessmentFinanceController {
  async upsertFeeSchedule({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(feeScheduleValidator)
    const service = new AssessmentService()
    const row = await service.upsertFeeSchedule({
      organizationId: user.organizationId,
      ...payload,
    })
    return response.created({ data: row })
  }

  async listFeeSchedules({ response, auth }: HttpContext) {
    const user = auth.user!
    const rows = await FeeSchedule.query()
      .where('organization_id', user.organizationId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')
    const { default: FeeScheduleLine } = await import('#modules/enrollment/models/fee_schedule_line')
    const data = []
    for (const row of rows) {
      const lines = await FeeScheduleLine.query().where('fee_schedule_id', row.id)
      data.push({ ...row.serialize(), lines })
    }
    return response.ok({ data })
  }

  async tagAid({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(aidTagValidator)
    const service = new AssessmentService()
    const row = await service.tagAid({
      organizationId: user.organizationId,
      ...payload,
      taggedBy: user.id,
    })
    return response.created({ data: row })
  }

  async listAidTags({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = AssessmentAidTag.query().where('organization_id', user.organizationId)
    if (request.input('studentId')) q.where('student_id', request.input('studentId'))
    if (request.input('enrollmentId')) q.where('enrollment_id', request.input('enrollmentId'))
    return response.ok({ data: await q.orderBy('created_at', 'desc') })
  }

  async prepare({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(prepareAssessmentValidator)
    const service = new AssessmentService()
    const prepared = await service.prepareAssessment({
      organizationId: user.organizationId,
      enrollmentId: payload.enrollmentId,
      actorUserId: user.id,
      feeScheduleId: payload.feeScheduleId,
      tuitionFee: payload.tuitionFee,
      miscFees: payload.miscFees,
      discount: payload.discount,
    })

    let submit: unknown = null
    if (payload.submitToUfms) {
      const key = request.header('idempotency-key') ?? undefined
      submit = await service.submitToUfms({
        organizationId: user.organizationId,
        assessmentId: prepared.assessment.id,
        idempotencyKey: key,
      })
    }

    return response.created({ data: { ...prepared, submit } })
  }

  async submitToUfms({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new AssessmentService()
    const result = await service.submitToUfms({
      organizationId: user.organizationId,
      assessmentId: params.id,
      idempotencyKey: request.header('idempotency-key') ?? undefined,
    })
    return response.ok({ data: result })
  }

  async syncPaymentStatus({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new AssessmentService()
    const result = await service.syncPaymentStatus({
      organizationId: user.organizationId,
      assessmentId: params.id,
      actorUserId: user.id,
      idempotencyKey: request.header('idempotency-key') ?? undefined,
    })
    return response.ok({ data: result })
  }

  async show({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const assessment = await Assessment.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .preload('enrollment')
      .firstOrFail()
    const lines = await AssessmentLine.query().where('assessment_id', assessment.id)
    return response.ok({ data: { ...assessment.serialize(), lines } })
  }

  async studentMonitor(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.user!
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? [])
    const canMonitorOthers =
      permissions.includes('*') ||
      permissions.includes('students.read') ||
      permissions.includes('enrollments.read')
    if (!canMonitorOthers) {
      const self = await resolveLinkedStudent(user.organizationId, user.email)
      if (!self || self.id !== params.studentId) {
        return response.forbidden({ message: 'Forbidden' })
      }
    }
    const service = new AssessmentService()
    const data = await service.getStudentAccountMonitor(user.organizationId, params.studentId)
    return response.ok({ data })
  }

  async myMonitor({ response, auth }: HttpContext) {
    const user = auth.user!
    const student = await resolveLinkedStudent(user.organizationId, user.email)
    if (!student) {
      return response.notFound({ message: 'No student profile linked to this account' })
    }
    const service = new AssessmentService()
    const data = await service.getStudentAccountMonitor(user.organizationId, student.id)
    return response.ok({ data })
  }

  async issueDocument(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    const payload = await request.validateUsing(issueDocumentValidator)
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? [])
    const canStaffIssue =
      permissions.includes('*') ||
      permissions.includes('enrollments.write') ||
      permissions.includes('assessments.write')
    const canSelfIssue = permissions.includes('students.self')

    if (!canStaffIssue && canSelfIssue) {
      if (payload.docType !== 'assessment_form') {
        return response.forbidden({ message: 'Students may only print assessment forms' })
      }
      const student = await resolveLinkedStudent(user.organizationId, user.email)
      if (!student) {
        return response.notFound({ message: 'No student profile linked to this account' })
      }
      const enrollment = await Enrollment.query()
        .where('id', payload.enrollmentId)
        .where('organization_id', user.organizationId)
        .where('student_id', student.id)
        .first()
      if (!enrollment) {
        return response.forbidden({ message: 'Enrollment does not belong to this student' })
      }
    } else if (!canStaffIssue) {
      return response.forbidden({ message: 'Not allowed to issue registration documents' })
    }

    const service = new AssessmentService()
    const doc = await service.issueDocument({
      organizationId: user.organizationId,
      enrollmentId: payload.enrollmentId,
      docType: payload.docType,
      actorUserId: user.id,
    })
    return response.created({ data: doc })
  }

  async verifyDocument({ params, response }: HttpContext) {
    const service = new AssessmentService()
    const doc = await service.verifyDocumentQr(params.qrToken)
    return response.ok({ data: doc })
  }

  async listDocuments(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? [])
    const q = RegistrationDocument.query().where('organization_id', user.organizationId)
    if (request.input('enrollmentId')) q.where('enrollment_id', request.input('enrollmentId'))
    if (request.input('docType')) q.where('doc_type', request.input('docType'))

    const staffRead =
      permissions.includes('*') ||
      permissions.includes('assessments.read') ||
      permissions.includes('enrollments.read') ||
      permissions.includes('enrollments.write')
    if (!staffRead && permissions.includes('students.self')) {
      const student = await resolveLinkedStudent(user.organizationId, user.email)
      if (!student) return response.ok({ data: [] })
      const enrollmentIds = (
        await Enrollment.query()
          .where('organization_id', user.organizationId)
          .where('student_id', student.id)
          .select('id')
      ).map((e) => e.id)
      if (!enrollmentIds.length) return response.ok({ data: [] })
      q.whereIn('enrollment_id', enrollmentIds)
    }

    return response.ok({ data: await q.orderBy('issued_at', 'desc') })
  }

  async integrationHistory({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = FinanceIntegrationTransaction.query().where('organization_id', user.organizationId)
    if (request.input('assessmentId')) q.where('assessment_id', request.input('assessmentId'))
    if (request.input('enrollmentId')) q.where('enrollment_id', request.input('enrollmentId'))
    return response.ok({ data: await q.orderBy('created_at', 'desc').limit(100) })
  }
}
