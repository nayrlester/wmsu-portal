import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { AdvisingService } from '#modules/enrollment/services/advising_service'
import AdvisingPeriod from '#modules/enrollment/models/advising_period'
import AdvisingSession from '#modules/enrollment/models/advising_session'
import AdvisingRecommendation from '#modules/enrollment/models/advising_recommendation'
import AdviserAssignment from '#modules/enrollment/models/adviser_assignment'
import {
  startAdvisingSessionValidator,
  addRecommendationValidator,
  endorseAdvisingValidator,
  advisingWaiverValidator,
  adviserAssignmentValidator,
  advisingPeriodValidator,
} from '#modules/enrollment/validators/enrollment_workflow'
import { evaluateCurriculum } from '#modules/enrollment/services/enrollment_validation_service'
import { curriculumService } from '#modules/enrollment/services/curriculum_service'
import { studentCourseSelectionService } from '#modules/enrollment/services/student_course_selection_service'
import vine from '@vinejs/vine'
import Student from '#modules/enrollment/models/student'
import Enrollment from '#modules/enrollment/models/enrollment'
import { resolveEnrollmentId } from '#modules/enrollment/services/enrollment_flow_service'

export default class AdvisingController {
  async assignAdviser({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(adviserAssignmentValidator)
    const service = new AdvisingService()
    const row = await service.upsertAdviserAssignment({
      organizationId: user.organizationId,
      ...payload,
      actorUserId: user.id,
    })
    return response.created({ data: row })
  }

  async reassignAdviser({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const newAdviserUserId = request.input('adviserUserId')
    const service = new AdvisingService()
    const row = await service.reassignAdviser(params.id, newAdviserUserId, user.id)
    return response.ok({ data: row })
  }

  async listAssignments({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = AdviserAssignment.query()
      .where('organization_id', user.organizationId)
      .where('is_active', true)
    if (request.input('studentId')) q.where('student_id', request.input('studentId'))
    if (request.input('programId')) q.where('program_id', request.input('programId'))
    return response.ok({ data: await q })
  }

  async listPeriods({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = AdvisingPeriod.query().where('organization_id', user.organizationId)
    if (request.input('academicYearId')) q.where('academic_year_id', request.input('academicYearId'))
    if (request.input('semester')) q.where('semester', Number(request.input('semester')))
    const rows = await q.orderBy('semester', 'asc')
    return response.ok({ data: rows })
  }

  async upsertPeriod({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(advisingPeriodValidator)
    const row = await AdvisingPeriod.updateOrCreate(
      {
        organizationId: user.organizationId,
        academicYearId: payload.academicYearId,
        semester: payload.semester,
      },
      {
        organizationId: user.organizationId,
        academicYearId: payload.academicYearId,
        semester: payload.semester,
        startsAt: DateTime.fromISO(payload.startsAt),
        endsAt: DateTime.fromISO(payload.endsAt),
        enforceCutoff: payload.enforceCutoff ?? true,
      }
    )
    return response.ok({ data: row })
  }

  async startSession({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(startAdvisingSessionValidator)
    const service = new AdvisingService()
    const result = await service.startSession({
      organizationId: user.organizationId,
      enrollmentId: payload.enrollmentId,
      adviserUserId: user.id,
      mode: payload.mode,
      onBehalf: payload.onBehalf,
    })
    return response.created({ data: result })
  }

  async addRecommendation({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(addRecommendationValidator)
    const service = new AdvisingService()
    const rec = await service.addRecommendation({
      organizationId: user.organizationId,
      sessionId: params.id,
      actorUserId: user.id,
      ...payload,
    })
    return response.created({ data: rec })
  }

  async removeRecommendation({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new AdvisingService()
    await service.removeRecommendation(user.organizationId, params.recommendationId, user.id)
    return response.ok({ data: { removed: true } })
  }

  async assignCourse({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(
      vine.compile(
        vine.object({
          curriculumIds: vine.array(vine.string().uuid()),
        })
      )
    )
    const data = await studentCourseSelectionService.assignAdviserCourses({
      organizationId: user.organizationId,
      sessionId: params.id,
      curriculumIds: payload.curriculumIds,
    })
    return response.ok({ data })
  }

  async endorse({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(endorseAdvisingValidator)
    const service = new AdvisingService()
    const result = await service.endorseSession({
      organizationId: user.organizationId,
      sessionId: params.id,
      actorUserId: user.id,
      ...payload,
    })
    return response.ok({ data: result })
  }

  async waiver({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(advisingWaiverValidator)
    const ref = payload.enrollmentRef ?? payload.enrollmentId
    if (!ref) {
      return response.unprocessableEntity({ error: 'enrollmentRef or enrollmentId is required' })
    }
    const enrollmentId = await resolveEnrollmentId(user.organizationId, ref)
    const service = new AdvisingService()
    const result = await service.recordBlockWaiver({
      organizationId: user.organizationId,
      enrollmentId,
      authorizedBy: user.id,
      authorityRole: payload.authorityRole,
      reason: payload.reason,
      effectiveTo: payload.effectiveTo,
    })
    return response.created({ data: result })
  }

  async curriculumEvaluation({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const student = await Student.query()
      .where('id', params.studentId)
      .where('organization_id', user.organizationId)
      .firstOrFail()
    const evaluation = await evaluateCurriculum({
      organizationId: user.organizationId,
      studentId: student.id,
      programId: student.programId,
      yearLevel: student.yearLevel,
    })
    return response.ok({ data: evaluation })
  }

  async sessionShow({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const session = await AdvisingSession.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .preload('recommendations')
      .preload('enrollment', (enrollment) => enrollment.preload('student'))
      .firstOrFail()
    if (session.status === 'in_progress' && session.enrollment?.student) {
      const evaluation = await evaluateCurriculum({
        organizationId: user.organizationId,
        studentId: session.enrollment.student.id,
        programId: session.enrollment.student.programId,
        yearLevel: session.enrollment.yearLevel,
      })
      const advisingCourses = await curriculumService.advisingCourseOptions({
        organizationId: user.organizationId,
        studentProgramId: session.enrollment.student.programId,
        yearLevel: session.enrollment.yearLevel,
        semester: session.enrollment.semester,
        assessedSubjects: evaluation.assessedSubjects,
      })
      session.curriculumEvaluation = { ...evaluation, advisingCourses }
      await session.save()
    }
    return response.ok({ data: session })
  }

  async history({ params, response, auth }: HttpContext) {
    const user = auth.user!
    await Enrollment.query()
      .where('id', params.enrollmentId)
      .where('organization_id', user.organizationId)
      .firstOrFail()
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { t } = await import('#modules/enrollment/helpers/db_schema')
    const rows = await db
      .from(t('advising_history'))
      .where('enrollment_id', params.enrollmentId)
      .orderBy('created_at', 'asc')
    return response.ok({ data: rows })
  }

  async dashboard({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const service = new AdvisingService()
    const data = await service.advisingDashboard(
      user.organizationId,
      request.input('academicYearId'),
      request.input('semester') ? Number(request.input('semester')) : undefined
    )
    return response.ok({ data })
  }

  async listRecommendations({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const rows = await AdvisingRecommendation.query()
      .where('organization_id', user.organizationId)
      .where('advising_session_id', params.id)
    return response.ok({ data: rows })
  }
}
