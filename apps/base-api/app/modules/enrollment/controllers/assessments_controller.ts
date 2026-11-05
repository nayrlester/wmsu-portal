import type { HttpContext } from '@adonisjs/core/http'
import Assessment from '#modules/enrollment/models/assessment'

export default class AssessmentsController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const enrollmentId = request.input('enrollmentId')

    const query = Assessment.query()
      .where('organization_id', user.organizationId)
      .preload('enrollment')
      .orderBy('created_at', 'desc')

    if (enrollmentId) query.where('enrollment_id', enrollmentId)

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
