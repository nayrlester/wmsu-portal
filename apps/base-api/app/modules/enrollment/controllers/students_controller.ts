import type { HttpContext } from '@adonisjs/core/http'
import Student from '#modules/enrollment/models/student'

export default class StudentsController {
  async me({ response, auth }: HttpContext) {
    const user = auth.user!
    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return response.notFound({ message: 'No student profile linked to this account' })
    }

    const student = await Student.query()
      .where('organization_id', user.organizationId)
      .whereRaw('LOWER(email) = ?', [email])
      .first()

    if (!student) {
      return response.notFound({ message: 'No student profile linked to this account' })
    }

    return response.ok({ data: student })
  }

  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const status = request.input('status')
    const search = request.input('search')

    const query = Student.query().where('organization_id', user.organizationId).orderBy('created_at', 'desc')

    if (status) query.where('status', status)
    if (search) {
      query.where((q) => {
        q.where('student_number', 'ILIKE', `%${search}%`)
          .orWhere('first_name', 'ILIKE', `%${search}%`)
          .orWhere('last_name', 'ILIKE', `%${search}%`)
          .orWhere('email', 'ILIKE', `%${search}%`)
      })
    }

    const students = await query.paginate(page, limit)
    return response.ok({ data: students })
  }

  async show({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const student = await Student.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .preload('program')
      .firstOrFail()

    return response.ok({ data: student })
  }
}
