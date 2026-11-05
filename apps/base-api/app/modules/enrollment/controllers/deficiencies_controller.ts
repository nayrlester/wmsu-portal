import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { studentRequirementsService } from '#modules/enrollment/services/student_requirements_service'

const createValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    requirementCode: vine.string().trim().minLength(1).maxLength(64),
    description: vine.string().trim().minLength(1).maxLength(512),
  })
)

const updateValidator = vine.compile(
  vine.object({
    requirementCode: vine.string().trim().minLength(1).maxLength(64).optional(),
    description: vine.string().trim().minLength(1).maxLength(512).optional(),
    status: vine.enum(['open', 'submitted', 'approved', 'rejected', 'cleared'] as const).optional(),
  })
)

const reviewValidator = vine.compile(
  vine.object({
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)

function serialize(row: {
  id: string
  studentId: string
  requirementCode: string
  description: string
  status: string
  reviewNotes: string | null
  reviewedAt: { toISO(): string | null } | null
  clearedAt: { toISO(): string | null } | null
  createdAt: { toISO(): string | null }
  student?: { studentNumber?: string; firstName?: string; lastName?: string } | null
}) {
  return {
    id: row.id,
    studentId: row.studentId,
    studentNumber: row.student?.studentNumber ?? null,
    studentName: row.student ? `${row.student.lastName}, ${row.student.firstName}` : null,
    requirementCode: row.requirementCode,
    description: row.description,
    status: row.status,
    reviewNotes: row.reviewNotes,
    reviewedAt: row.reviewedAt?.toISO() ?? null,
    clearedAt: row.clearedAt?.toISO() ?? null,
    createdAt: row.createdAt.toISO(),
  }
}

export default class DeficienciesController {
  async index({ request, response, auth }: HttpContext) {
    const rows = await studentRequirementsService.list(auth.user!.organizationId, {
      studentId: request.input('studentId') || undefined,
      status: request.input('status') || undefined,
    })
    return response.ok({ data: rows.map(serialize) })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(createValidator)
    const row = await studentRequirementsService.create(user.organizationId, body, user.id)
    return response.created({ data: serialize(row) })
  }

  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(updateValidator)
    const row = await studentRequirementsService.update(user.organizationId, params.id, body, user.id)
    return response.ok({ data: serialize(row) })
  }

  async destroy({ params, response, auth }: HttpContext) {
    const user = auth.user!
    await studentRequirementsService.softDelete(user.organizationId, params.id, user.id)
    return response.noContent()
  }

  async submit({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(reviewValidator)
    const row = await studentRequirementsService.submit(
      user.organizationId,
      params.id,
      user.id,
      body.notes
    )
    return response.ok({ data: serialize(row) })
  }

  async approve({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(reviewValidator)
    const row = await studentRequirementsService.approve(
      user.organizationId,
      params.id,
      user.id,
      body.notes
    )
    return response.ok({ data: serialize(row) })
  }

  async reject({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(reviewValidator)
    const row = await studentRequirementsService.reject(
      user.organizationId,
      params.id,
      user.id,
      body.notes
    )
    return response.ok({ data: serialize(row) })
  }

  async clear({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const row = await studentRequirementsService.clear(user.organizationId, params.id, user.id)
    return response.ok({ data: serialize(row) })
  }

  async complianceReport({ response, auth }: HttpContext) {
    const data = await studentRequirementsService.complianceReport(auth.user!.organizationId)
    return response.ok({ data })
  }
}
