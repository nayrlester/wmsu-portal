import type { HttpContext } from '@adonisjs/core/http'
import Subject from '#modules/enrollment/models/subject'

export default class SubjectsController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 50)
    const search = String(request.input('search') || '').trim()

    const query = Subject.query()
      .where('organization_id', user.organizationId)
      .where('is_active', true)
      .orderBy('subject_code', 'asc')

    if (search) {
      query.where((q) => {
        q.whereILike('subject_code', `%${search}%`).orWhereILike('title', `%${search}%`)
      })
    }

    const subjects = await query.paginate(page, limit)
    return response.ok({
      data: {
        meta: subjects.getMeta(),
        data: subjects.all().map((s) => ({
          id: s.id,
          subjectCode: s.subjectCode,
          title: s.title,
          units: s.units,
          lectureHours: s.lectureHours,
          laboratoryHours: s.laboratoryHours,
          programId: s.programId,
          isActive: s.isActive,
        })),
      },
    })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = request.only([
      'subjectCode',
      'title',
      'units',
      'programId',
      'lectureHours',
      'laboratoryHours',
    ])

    const subject = await Subject.create({
      organizationId: user.organizationId,
      subjectCode: String(payload.subjectCode),
      title: String(payload.title),
      units: Number(payload.units) || 3,
      lectureHours:
        payload.lectureHours === undefined || payload.lectureHours === null || payload.lectureHours === ''
          ? null
          : Number(payload.lectureHours),
      laboratoryHours:
        payload.laboratoryHours === undefined ||
        payload.laboratoryHours === null ||
        payload.laboratoryHours === ''
          ? null
          : Number(payload.laboratoryHours),
      programId: (payload.programId as string) || null,
      isActive: true,
    })

    return response.created({
      data: {
        id: subject.id,
        subjectCode: subject.subjectCode,
        title: subject.title,
        units: subject.units,
        lectureHours: subject.lectureHours,
        laboratoryHours: subject.laboratoryHours,
        programId: subject.programId,
        isActive: subject.isActive,
      },
    })
  }
}
