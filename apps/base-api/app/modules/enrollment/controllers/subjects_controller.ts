import type { HttpContext } from '@adonisjs/core/http'
import Subject from '#modules/enrollment/models/subject'

export default class SubjectsController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 50)

    const subjects = await Subject.query()
      .where('organization_id', user.organizationId)
      .where('is_active', true)
      .orderBy('subject_code', 'asc')
      .paginate(page, limit)

    return response.ok({ data: subjects })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = request.only(['subjectCode', 'title', 'units', 'programId'])

    const subject = await Subject.create({
      organizationId: user.organizationId,
      subjectCode: String(payload.subjectCode),
      title: String(payload.title),
      units: Number(payload.units) || 3,
      programId: (payload.programId as string) || null,
      isActive: true,
    })

    return response.created({ data: subject })
  }
}
