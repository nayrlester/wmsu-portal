import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import Applicant from '#modules/enrollment/models/applicant'
import { EnrollmentFlowService } from '#modules/enrollment/services/enrollment_flow_service'
import { STUDENT_CLASSIFICATIONS } from '#modules/enrollment/domain/enrollment_workflow'
import { createApplicantValidator, updateApplicantValidator, admitApplicantValidator } from '#modules/enrollment/validators/enrollment'
import { t } from '#modules/enrollment/helpers/db_schema'

export default class ApplicantsController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const status = request.input('status')
    const search = String(request.input('search') ?? '').trim()

    const query = Applicant.query().where('organization_id', user.organizationId).orderBy('created_at', 'desc')

    if (status) query.where('status', status)
    if (search) {
      const term = `%${search}%`
      query.where((builder) => {
        builder
          .where('application_number', 'ILIKE', term)
          .orWhere('first_name', 'ILIKE', term)
          .orWhere('last_name', 'ILIKE', term)
          .orWhere('email', 'ILIKE', term)
      })
    }

    const applicants = await query.paginate(page, limit)
    return response.ok({ data: applicants })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createApplicantValidator)
    if (
      payload.classification &&
      !(STUDENT_CLASSIFICATIONS as readonly string[]).includes(payload.classification)
    ) {
      return response.unprocessableEntity({ message: 'Invalid applicant classification' })
    }

    const applicant = await Applicant.create({
      organizationId: user.organizationId,
      ...payload,
      classification: payload.classification ?? null,
      mdmCampusId: payload.mdmCampusId ?? null,
      appliedAt: DateTime.now(),
      status: 'pending',
      formConfigId: null,
      formAnswers: {},
      surveyAnswers: {},
      termsAcceptedAt: null,
      privacyConsentAt: null,
      privacyConsentVersion: null,
    })

    return response.created({ data: applicant })
  }

  async show({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const applicant = await Applicant.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .preload('program')
      .firstOrFail()

    return response.ok({ data: applicant })
  }

  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(updateApplicantValidator)
    if (
      payload.classification !== undefined &&
      payload.classification !== null &&
      payload.classification !== '' &&
      !(STUDENT_CLASSIFICATIONS as readonly string[]).includes(payload.classification)
    ) {
      return response.unprocessableEntity({ message: 'Invalid applicant classification' })
    }

    const applicant = await Applicant.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .firstOrFail()

    const previousStatus = applicant.status
    const previousClassification = applicant.classification
    applicant.merge(payload)
    await applicant.save()

    if (
      payload.classification !== undefined &&
      previousClassification !== (payload.classification ?? null)
    ) {
      await db.table(t('usis_student_classification_history')).insert({
        id: randomUUID(),
        organization_id: user.organizationId,
        student_id: null,
        applicant_id: applicant.id,
        from_classification: previousClassification,
        to_classification: payload.classification ?? 'cleared',
        changed_by: user.id,
        note: 'Registrar applicant classification update',
        created_at: DateTime.now().toSQL(),
      })
    }

    if (payload.status && payload.status !== previousStatus) {
      try {
        const { admissionEventsService } = await import(
          '#modules/enrollment/services/admission_events_service'
        )
        await admissionEventsService.recordStatusChange({
          organizationId: user.organizationId,
          applicantId: applicant.id,
          fromStatus: previousStatus,
          toStatus: payload.status,
          note: 'Manual status update',
          actorUserId: user.id,
        })
      } catch {
        /* additive history only */
      }
    }

    return response.ok({ data: applicant })
  }

  async admit({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(admitApplicantValidator)

    const service = new EnrollmentFlowService()
    const result = await service.admitApplicant(params.id, payload.studentNumber, user.organizationId)

    return response.ok({ data: result })
  }
}
