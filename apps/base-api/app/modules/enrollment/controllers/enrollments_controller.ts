import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Enrollment from '#modules/enrollment/models/enrollment'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import EnrollmentOverride from '#modules/enrollment/models/enrollment_override'
import EnrollmentChangeRequest from '#modules/enrollment/models/enrollment_change_request'
import UnitLoadPolicy from '#modules/enrollment/models/unit_load_policy'
import { EnrollmentFlowService } from '#modules/enrollment/services/enrollment_flow_service'
import {
  createEnrollmentValidator,
  advisingApproveValidator,
  assessEnrollmentValidator,
} from '#modules/enrollment/validators/enrollment'
import {
  createEnrollmentWorkflowValidator,
  enrollmentOverrideValidator,
  enrollmentChangeRequestValidator,
  decideChangeValidator,
  rejectEnrollmentValidator,
  changeWindowValidator,
  unitLoadPolicyValidator,
} from '#modules/enrollment/validators/enrollment_workflow'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import {
  assertEnrollmentVisible,
  effectivePermissions,
  hasStaffEnrollmentAccess,
  resolveSelfStudent,
} from '#modules/enrollment/services/enrollment_access_service'

export default class EnrollmentsController {
  async index(ctx: HttpContext) {
    const user = ctx.auth.user!
    const page = ctx.request.input('page', 1)
    const limit = ctx.request.input('limit', 20)
    let studentId = ctx.request.input('studentId')
    const academicYearId = ctx.request.input('academicYearId')
    const status = ctx.request.input('status')

    const permissions = await effectivePermissions(ctx)
    const staff = hasStaffEnrollmentAccess(permissions)
    if (!staff) {
      const self = await resolveSelfStudent(user)
      if (!self) return ctx.response.forbidden({ error: 'Forbidden' })
      studentId = self.id
    }

    const query = Enrollment.query()
      .where('organization_id', user.organizationId)
      .preload('student')
      .preload('academicYear')
      .preload('section')
      .orderBy('created_at', 'desc')

    if (studentId) query.where('student_id', studentId)
    if (academicYearId) query.where('academic_year_id', academicYearId)
    if (status) query.where('status', status)

    const enrollments = await query.paginate(page, limit)
    return ctx.response.ok({ data: enrollments })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const hasClassification = request.input('classification')
    const service = new EnrollmentFlowService()

    if (hasClassification) {
      const payload = await request.validateUsing(createEnrollmentWorkflowValidator)
      const enrollment = await service.createEnrollment({
        organizationId: user.organizationId,
        ...payload,
        actorUserId: user.id,
      })
      return response.created({ data: enrollment })
    }

    const payload = await request.validateUsing(createEnrollmentValidator)
    const enrollment = await service.createEnrollment({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      academicYearId: payload.academicYearId,
      sectionId: payload.sectionId,
      yearLevel: payload.yearLevel,
      semester: payload.semester,
      classification: 'continuing',
      actorUserId: user.id,
    })
    return response.created({ data: enrollment })
  }

  async show(ctx: HttpContext) {
    const user = ctx.auth.user!
    const enrollment = await Enrollment.query()
      .where('id', ctx.params.id)
      .where('organization_id', user.organizationId)
      .preload('student')
      .preload('academicYear')
      .preload('section')
      .firstOrFail()

    try {
      await assertEnrollmentVisible(ctx, enrollment)
    } catch {
      return ctx.response.forbidden({ error: 'Forbidden' })
    }

    const lines = await EnrollmentLine.query().where('enrollment_id', enrollment.id)
    const overrides = await EnrollmentOverride.query().where('enrollment_id', enrollment.id)
    return ctx.response.ok({ data: { ...enrollment.serialize(), lines, overrides } })
  }

  async advise({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(advisingApproveValidator)
    const service = new EnrollmentFlowService()
    const enrollment = await service.advisingApprove(payload.enrollmentId, user.id)
    return response.ok({ data: enrollment })
  }

  async assess({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(assessEnrollmentValidator)
    const service = new EnrollmentFlowService()
    const assessment = await service.assess(payload.enrollmentId, user.id, {
      tuitionFee: payload.tuitionFee,
      miscFees: payload.miscFees,
      discount: payload.discount,
    })
    return response.ok({ data: assessment })
  }

  async verifyPayment({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new EnrollmentFlowService()
    const enrollment = await service.verifyPayment(params.id, user.id)
    return response.ok({ data: enrollment })
  }

  async registrarApprove({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new EnrollmentFlowService()
    const enrollment = await service.approveRegistrar(params.id, user.id)
    return response.ok({ data: enrollment })
  }

  async register({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new EnrollmentFlowService()
    const enrollment = await service.register(params.id, user.id)
    return response.ok({ data: enrollment })
  }

  async reject({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(rejectEnrollmentValidator)
    const service = new EnrollmentFlowService()
    const enrollment = await service.reject(params.id, user.id, payload.reason)
    return response.ok({ data: enrollment })
  }

  async incomplete({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(rejectEnrollmentValidator)
    const service = new EnrollmentFlowService()
    const enrollment = await service.markIncomplete(params.id, user.id, payload.reason)
    return response.ok({ data: enrollment })
  }

  async override({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(enrollmentOverrideValidator)
    const service = new EnrollmentFlowService()
    const row = await service.addOverride({
      organizationId: user.organizationId,
      enrollmentId: payload.enrollmentId,
      overrideType: payload.overrideType,
      reason: payload.reason,
      authorizedBy: user.id,
    })
    return response.created({ data: row })
  }

  async requestChange({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(enrollmentChangeRequestValidator)
    const service = new EnrollmentFlowService()
    const row = await service.requestChange({
      organizationId: user.organizationId,
      ...payload,
      actorUserId: user.id,
    })
    return response.created({ data: row })
  }

  async decideChange({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(decideChangeValidator)
    const service = new EnrollmentFlowService()
    const result = await service.decideChange({
      organizationId: user.organizationId,
      requestId: params.id,
      approve: payload.approve,
      actorUserId: user.id,
      notes: payload.notes,
    })
    return response.ok({ data: result })
  }

  async listChangeRequests({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = EnrollmentChangeRequest.query().where('organization_id', user.organizationId)
    if (request.input('enrollmentId')) q.where('enrollment_id', request.input('enrollmentId'))
    if (request.input('status')) q.where('status', request.input('status'))
    return response.ok({ data: await q.orderBy('created_at', 'desc') })
  }

  async upsertChangeWindow({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(changeWindowValidator)
    const id = randomUUID()
    const existing = await db
      .from(t('enrollment_change_windows'))
      .where({
        organization_id: user.organizationId,
        academic_year_id: payload.academicYearId,
        semester: payload.semester,
        change_type: payload.changeType,
      })
      .first()

    if (existing) {
      await db
        .from(t('enrollment_change_windows'))
        .where('id', existing.id)
        .update({
          starts_at: DateTime.fromISO(payload.startsAt).toSQL(),
          ends_at: DateTime.fromISO(payload.endsAt).toSQL(),
          updated_at: new Date(),
        })
      return response.ok({ data: { id: existing.id, ...payload } })
    }

    await db.table(t('enrollment_change_windows')).insert({
      id,
      organization_id: user.organizationId,
      academic_year_id: payload.academicYearId,
      semester: payload.semester,
      change_type: payload.changeType,
      starts_at: DateTime.fromISO(payload.startsAt).toSQL(),
      ends_at: DateTime.fromISO(payload.endsAt).toSQL(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    return response.created({ data: { id, ...payload } })
  }

  async upsertUnitLoadPolicy({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(unitLoadPolicyValidator)
    const row = await UnitLoadPolicy.create({
      organizationId: user.organizationId,
      programId: payload.programId ?? null,
      yearLevel: payload.yearLevel ?? null,
      minUnits: payload.minUnits,
      maxUnits: payload.maxUnits,
      overloadMaxUnits: payload.overloadMaxUnits ?? null,
      isActive: true,
    })
    return response.created({ data: row })
  }
}
