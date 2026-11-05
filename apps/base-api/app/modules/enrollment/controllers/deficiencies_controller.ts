import type { HttpContext } from '@adonisjs/core/http'
import StudentDeficiency from '#modules/enrollment/models/student_deficiency'
import { DateTime } from 'luxon'

export default class DeficienciesController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const studentId = request.input('studentId')
    const query = StudentDeficiency.query()
      .where('organization_id', user.organizationId)
      .preload('student')
      .orderBy('created_at', 'desc')
    if (studentId) query.where('student_id', studentId)
    const rows = await query.paginate(request.input('page', 1), request.input('limit', 50))
    return response.ok({ data: rows })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = request.only(['studentId', 'requirementCode', 'description'])
    const row = await StudentDeficiency.create({
      organizationId: user.organizationId,
      studentId: String(body.studentId),
      requirementCode: String(body.requirementCode),
      description: String(body.description),
      status: 'open',
    })
    return response.created({ data: row })
  }

  async clear({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const row = await StudentDeficiency.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .firstOrFail()
    row.status = 'cleared'
    row.clearedAt = DateTime.now()
    await row.save()
    return response.ok({ data: row })
  }
}
