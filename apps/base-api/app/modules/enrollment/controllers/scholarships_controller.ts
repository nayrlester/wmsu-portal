import type { HttpContext } from '@adonisjs/core/http'
import Scholarship from '#modules/enrollment/models/scholarship'
import { DateTime } from 'luxon'

export default class ScholarshipsController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const studentId = request.input('studentId')
    const query = Scholarship.query()
      .where('organization_id', user.organizationId)
      .preload('student')
      .orderBy('awarded_at', 'desc')
    if (studentId) query.where('student_id', studentId)
    const rows = await query.paginate(request.input('page', 1), request.input('limit', 50))
    return response.ok({ data: rows })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = request.only(['studentId', 'scholarshipCode', 'name', 'amount'])
    const row = await Scholarship.create({
      organizationId: user.organizationId,
      studentId: String(body.studentId),
      scholarshipCode: String(body.scholarshipCode),
      name: String(body.name),
      amount: Number(body.amount) || 0,
      status: 'active',
      awardedAt: DateTime.now(),
    })
    return response.created({ data: row })
  }
}
