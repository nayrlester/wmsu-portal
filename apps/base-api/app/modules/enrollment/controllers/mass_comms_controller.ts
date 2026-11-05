import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { massCommsService } from '#modules/enrollment/services/mass_comms_service'
import { surveysService } from '#modules/enrollment/services/surveys_service'
import { announcementsService } from '#modules/enrollment/services/announcements_service'

const filterSchema = vine.object({
  yearLevels: vine.array(vine.number()).optional(),
  educationalLevels: vine.array(vine.string()).optional(),
  departmentCodes: vine.array(vine.string()).optional(),
  programIds: vine.array(vine.string().uuid()).optional(),
  sectionCodes: vine.array(vine.string()).optional(),
})

const previewValidator = vine.compile(
  vine.object({
    filters: filterSchema.optional(),
    recipientKinds: vine
      .array(vine.enum(['student', 'parent', 'guardian', 'sponsor'] as const))
      .optional(),
  })
)

const campaignValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(2).maxLength(255),
    message: vine.string().trim().minLength(1).maxLength(640),
    filters: filterSchema.optional(),
    recipientKinds: vine
      .array(vine.enum(['student', 'parent', 'guardian', 'sponsor'] as const))
      .optional(),
    announcementId: vine.string().uuid().optional(),
  })
)

const contactValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    relation: vine.enum(['parent', 'guardian', 'sponsor'] as const),
    fullName: vine.string().trim().minLength(2).maxLength(255),
    mobile: vine.string().trim().maxLength(32).optional(),
    email: vine.string().email().optional(),
    smsOptIn: vine.boolean().optional(),
  })
)

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const dt = new Date(String(value))
  if (Number.isNaN(dt.getTime())) throw new Error('Invalid datetime value')
  return dt
}

const surveyQuestionSchema = vine.object({
  id: vine.string().optional(),
  prompt: vine.string().trim().minLength(2),
  questionType: vine.enum(['single', 'multi', 'text', 'likert'] as const).optional(),
  options: vine.array(vine.string()).optional(),
  required: vine.boolean().optional(),
})

const surveyValidator = vine.compile(
  vine.object({
    kind: vine.enum(['survey', 'poll'] as const).optional(),
    title: vine.string().trim().minLength(3).maxLength(500),
    description: vine.string().trim().optional(),
    audience: vine
      .object({
        roles: vine.array(vine.string()).optional(),
        programIds: vine.array(vine.string().uuid()).optional(),
        yearLevels: vine.array(vine.number()).optional(),
        departmentCodes: vine.array(vine.string()).optional(),
        sectionCodes: vine.array(vine.string()).optional(),
        educationalLevels: vine.array(vine.string()).optional(),
      })
      .optional(),
    questions: vine.array(surveyQuestionSchema).minLength(1),
    opensAt: vine.string().trim().optional(),
    closesAt: vine.string().trim().optional(),
    openNow: vine.boolean().optional(),
  })
)

const surveyResponseValidator = vine.compile(
  vine.object({
    answers: vine.object({}).allowUnknownProperties(),
  })
)

export default class MassCommsController {
  private orgUser(ctx: HttpContext) {
    return ctx.auth.user ?? ctx.platformUser ?? null
  }

  async previewSms(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(previewValidator)
    const data = await massCommsService.previewRecipients({
      organizationId: user.organizationId,
      filters: body.filters ?? {},
      recipientKinds: body.recipientKinds,
    })
    return ctx.response.ok({ data })
  }

  async queueSms(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(campaignValidator)
    try {
      const data = await massCommsService.queueMassSms({
        organizationId: user.organizationId,
        userId: user.id,
        title: body.title,
        message: body.message,
        filters: body.filters,
        recipientKinds: body.recipientKinds,
        announcementId: body.announcementId,
      })
      return ctx.response.created({ data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Queue failed'
      const status = (err as { status?: number })?.status ?? 422
      return ctx.response.status(status).send({ error: message })
    }
  }

  async campaignsIndex(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const page = Number(ctx.request.input('page', 1))
    const limit = Number(ctx.request.input('limit', 20))
    const data = await massCommsService.listCampaigns(user.organizationId, page, limit)
    return ctx.response.ok({ data })
  }

  async storeContact(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(contactValidator)
    try {
      const data = await massCommsService.upsertStudentContact({
        organizationId: user.organizationId,
        studentId: body.studentId,
        relation: body.relation,
        fullName: body.fullName,
        mobile: body.mobile,
        email: body.email,
        smsOptIn: body.smsOptIn,
        actorUserId: user.id,
      })
      return ctx.response.created({ data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Contact save failed'
      const status = (err as { status?: number })?.status ?? 422
      return ctx.response.status(status).send({ error: message })
    }
  }

  async surveysIndex(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const page = Number(ctx.request.input('page', 1))
    const limit = Number(ctx.request.input('limit', 20))
    const data = await surveysService.listAdmin(user.organizationId, page, limit)
    return ctx.response.ok({ data })
  }

  async surveysStore(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(surveyValidator)
    try {
      const data = await surveysService.create({
        organizationId: user.organizationId,
        userId: user.id,
        kind: body.kind,
        title: body.title,
        description: body.description,
        audience: body.audience,
        questions: body.questions,
        opensAt: parseOptionalDate(body.opensAt) ?? null,
        closesAt: parseOptionalDate(body.closesAt) ?? null,
        openNow: body.openNow,
      })
      return ctx.response.created({ data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Survey create failed'
      const status = (err as { status?: number })?.status ?? 422
      return ctx.response.status(status).send({ error: message })
    }
  }

  async surveysPublish(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await surveysService.publish(ctx.params.id, user.organizationId, user.id)
    return ctx.response.ok({ data })
  }

  async surveysClose(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await surveysService.close(ctx.params.id, user.organizationId, user.id)
    return ctx.response.ok({ data })
  }

  async surveysResults(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await surveysService.results(ctx.params.id, user.organizationId)
    return ctx.response.ok({ data })
  }

  async surveysPending(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const identityRoles = ctx.platformClaims?.roles ?? []
    const localRoles = await announcementsService.loadUserRoleSlugs(user)
    const student = await announcementsService.resolveStudentForUser(user.organizationId, user.email)
    const data = await surveysService.pendingForUser(
      user.organizationId,
      { identityRoles, localRoleSlugs: localRoles, student },
      user.id
    )
    return ctx.response.ok({ data })
  }

  async surveysRespond(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(surveyResponseValidator)
    const identityRoles = ctx.platformClaims?.roles ?? []
    const localRoles = await announcementsService.loadUserRoleSlugs(user)
    const student = await announcementsService.resolveStudentForUser(user.organizationId, user.email)
    try {
      const answers: Record<string, string | string[] | number> = {}
      for (const [key, val] of Object.entries(body.answers)) {
        if (typeof val === 'string' || typeof val === 'number' || Array.isArray(val)) {
          answers[key] = val as string | string[] | number
        }
      }
      const data = await surveysService.submit({
        organizationId: user.organizationId,
        surveyId: ctx.params.id,
        userId: user.id,
        student,
        answers,
        ctx: { identityRoles, localRoleSlugs: localRoles, student },
      })
      return ctx.response.created({ data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submit failed'
      const status = (err as { status?: number })?.status ?? 422
      return ctx.response.status(status).send({ error: message })
    }
  }
}
