import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { subjectCreditService } from '#modules/enrollment/services/subject_credit_service'

const externalCreditValidator = vine.compile(
  vine.object({
    externalSubjectCode: vine.string().trim().minLength(1).maxLength(64),
    externalSubjectTitle: vine.string().trim().minLength(1).maxLength(255),
    units: vine.number().min(0).max(30),
    sourceSchool: vine.string().trim().maxLength(255).optional(),
    notes: vine.string().trim().optional(),
    mapToSubjectId: vine.string().uuid().optional(),
  })
)

const reviewValidator = vine.compile(
  vine.object({
    decision: vine.enum(['credited', 'rejected'] as const),
    mapToSubjectId: vine.string().uuid().optional(),
    notes: vine.string().trim().optional(),
  })
)

const equivalencyValidator = vine.compile(
  vine.object({
    internalSubjectId: vine.string().uuid(),
    externalCode: vine.string().trim().minLength(1).maxLength(64),
    externalTitle: vine.string().trim().maxLength(255).optional(),
    sourceSchool: vine.string().trim().maxLength(255).optional(),
  })
)

function serializeCredit(row: {
  id: string
  subjectId: string | null
  subjectCode: string
  subjectTitle: string
  units: number
  creditType: string
  sourceSchool: string | null
  status: string
  externalSubjectCode: string | null
  externalSubjectTitle: string | null
  notes: string | null
  reviewedAt: { toISO(): string | null } | null
  createdAt: { toISO(): string | null }
}) {
  return {
    id: row.id,
    subjectId: row.subjectId,
    subjectCode: row.subjectCode,
    subjectTitle: row.subjectTitle,
    units: row.units,
    creditType: row.creditType,
    sourceSchool: row.sourceSchool,
    status: row.status,
    externalSubjectCode: row.externalSubjectCode,
    externalSubjectTitle: row.externalSubjectTitle,
    notes: row.notes,
    reviewedAt: row.reviewedAt?.toISO() ?? null,
    createdAt: row.createdAt.toISO(),
  }
}

export default class SubjectCreditsController {
  async evaluate(ctx: HttpContext) {
    const data = await subjectCreditService.evaluate(
      ctx.auth.user!.organizationId,
      ctx.params.studentId
    )
    return ctx.response.ok({ data })
  }

  async listCredits(ctx: HttpContext) {
    const rows = await subjectCreditService.listCredits(
      ctx.auth.user!.organizationId,
      ctx.params.studentId
    )
    return ctx.response.ok({ data: rows.map(serializeCredit) })
  }

  async autoInternal(ctx: HttpContext) {
    const user = ctx.auth.user!
    const result = await subjectCreditService.autoCreditInternal(
      user.organizationId,
      ctx.params.studentId,
      user.id
    )
    return ctx.response.ok({
      data: {
        created: result.created.map(serializeCredit),
        evaluation: result.evaluation,
      },
    })
  }

  async submitExternal(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(externalCreditValidator)
    const row = await subjectCreditService.submitExternalCredit(
      user.organizationId,
      ctx.params.studentId,
      body,
      user.id
    )
    return ctx.response.created({ data: serializeCredit(row) })
  }

  async review(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(reviewValidator)
    const row = await subjectCreditService.reviewCredit(
      user.organizationId,
      ctx.params.studentId,
      ctx.params.creditId,
      body,
      user.id
    )
    return ctx.response.ok({ data: serializeCredit(row) })
  }

  async applyEquivalencies(ctx: HttpContext) {
    const user = ctx.auth.user!
    const rows = await subjectCreditService.applyEquivalencies(
      user.organizationId,
      ctx.params.studentId,
      user.id
    )
    return ctx.response.ok({ data: rows.map(serializeCredit) })
  }

  async listEquivalencies(ctx: HttpContext) {
    const rows = await subjectCreditService.listEquivalencies(ctx.auth.user!.organizationId)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        internalSubjectId: r.internalSubjectId,
        internalSubjectCode: r.internalSubject?.subjectCode ?? null,
        internalSubjectTitle: r.internalSubject?.title ?? null,
        externalCode: r.externalCode,
        externalTitle: r.externalTitle,
        sourceSchool: r.sourceSchool,
        isActive: r.isActive,
      })),
    })
  }

  async createEquivalency(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(equivalencyValidator)
    const row = await subjectCreditService.createEquivalency(user.organizationId, body, user.id)
    return ctx.response.created({
      data: {
        id: row.id,
        internalSubjectId: row.internalSubjectId,
        externalCode: row.externalCode,
        externalTitle: row.externalTitle,
        sourceSchool: row.sourceSchool,
      },
    })
  }
}
