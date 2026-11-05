import type { HttpContext } from '@adonisjs/core/http'
import Applicant from '#modules/enrollment/models/applicant'
import { EnrollmentFlowService } from '#modules/enrollment/services/enrollment_flow_service'
import { createApplicantValidator, updateApplicantValidator, admitApplicantValidator } from '#modules/enrollment/validators/enrollment'
import { DateTime } from 'luxon'

export default class ApplicantsController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const status = request.input('status')

    const query = Applicant.query().where('organization_id', user.organizationId).orderBy('created_at', 'desc')

    if (status) query.where('status', status)

    const applicants = await query.paginate(page, limit)
    return response.ok({ data: applicants })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createApplicantValidator)

    const applicant = await Applicant.create({
      organizationId: user.organizationId,
      ...payload,
      appliedAt: DateTime.now(),
      status: 'pending',
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

    const applicant = await Applicant.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .firstOrFail()

    applicant.merge(payload)
    await applicant.save()

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
