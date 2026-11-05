import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import UsisAnnouncement from '#modules/enrollment/models/usis_announcement'
import { announcementsService } from '#modules/enrollment/services/announcements_service'

const audienceSchema = vine.object({
  roles: vine.array(vine.string()).optional(),
  programIds: vine.array(vine.string()).optional(),
  yearLevels: vine.array(vine.number()).optional(),
  departmentCodes: vine.array(vine.string()).optional(),
  sectionCodes: vine.array(vine.string()).optional(),
})

const createValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(500),
    body: vine.string().trim().minLength(1),
    audience: audienceSchema.optional(),
    isPinned: vine.boolean().optional(),
    publishAt: vine.date().optional(),
    expiresAt: vine.date().optional(),
    deliverPortal: vine.boolean().optional(),
    deliverEmail: vine.boolean().optional(),
    deliverSms: vine.boolean().optional(),
    publishNow: vine.boolean().optional(),
  })
)

const updateValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(500).optional(),
    body: vine.string().trim().minLength(1).optional(),
    audience: audienceSchema.optional(),
    isPinned: vine.boolean().optional(),
    publishAt: vine.date().nullable().optional(),
    expiresAt: vine.date().nullable().optional(),
    deliverPortal: vine.boolean().optional(),
    deliverEmail: vine.boolean().optional(),
    deliverSms: vine.boolean().optional(),
    status: vine.enum(['draft', 'scheduled', 'published', 'archived'] as const).optional(),
  })
)

const settingsValidator = vine.compile(
  vine.object({
    socialFeaturesEnabled: vine.boolean(),
  })
)

const dispatchValidator = vine.compile(
  vine.object({
    channels: vine.array(vine.enum(['sms', 'email'] as const)).minLength(1),
    audience: audienceSchema.optional(),
  })
)

export default class AnnouncementsController {
  private orgUser(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) return null
    return user
  }

  async settingsIndex(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await announcementsService.getSettings(user.organizationId)
    return ctx.response.ok({ data })
  }

  async settingsUpdate(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(settingsValidator)
    const data = await announcementsService.updateSettings(user.organizationId, body.socialFeaturesEnabled)
    return ctx.response.ok({ data })
  }

  async index(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const page = Number(ctx.request.input('page', 1))
    const limit = Number(ctx.request.input('limit', 20))
    const data = await announcementsService.listAdmin(user.organizationId, page, limit)
    return ctx.response.ok({ data })
  }

  async store(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(createValidator)
    const data = await announcementsService.create({
      organizationId: user.organizationId,
      userId: user.id,
      title: body.title,
      body: body.body,
      audience: body.audience,
      isPinned: body.isPinned,
      publishAt: body.publishAt,
      expiresAt: body.expiresAt,
      deliverPortal: body.deliverPortal,
      deliverEmail: body.deliverEmail,
      deliverSms: body.deliverSms,
      publishNow: body.publishNow,
    })
    return ctx.response.created({ data })
  }

  async update(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(updateValidator)
    const data = await announcementsService.update(ctx.params.id, user.organizationId, user.id, {
      title: body.title,
      body: body.body,
      audience: body.audience,
      isPinned: body.isPinned,
      publishAt: body.publishAt === undefined ? undefined : body.publishAt,
      expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt,
      deliverPortal: body.deliverPortal,
      deliverEmail: body.deliverEmail,
      deliverSms: body.deliverSms,
      status: body.status,
    })
    return ctx.response.ok({ data })
  }

  async publish(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await announcementsService.publish(ctx.params.id, user.organizationId, user.id)
    return ctx.response.ok({ data })
  }

  async archive(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = await announcementsService.archive(ctx.params.id, user.organizationId, user.id)
    return ctx.response.ok({ data })
  }

  async feed(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const identityRoles = ctx.platformClaims?.roles ?? []
    const localRoles = await announcementsService.loadUserRoleSlugs(user)
    const student = await announcementsService.resolveStudentForUser(user.organizationId, user.email)
    const settings = await announcementsService.getSettings(user.organizationId)
    const items = await announcementsService.feed(user.organizationId, {
      identityRoles,
      localRoleSlugs: localRoles,
      student,
    })
    return ctx.response.ok({
      data: {
        items,
        settings: { socialFeaturesEnabled: settings.socialFeaturesEnabled },
      },
    })
  }

  async dispatch(ctx: HttpContext) {
    const user = this.orgUser(ctx)
    if (!user) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const body = await ctx.request.validateUsing(dispatchValidator)
    const announcement = await UsisAnnouncement.query()
      .where('id', ctx.params.id)
      .where('organization_id', user.organizationId)
      .firstOrFail()
    const audience = body.audience ?? announcement.audience ?? {}
    const results = []
    for (const channel of body.channels) {
      results.push(
        await announcementsService.queueMassDelivery({
          organizationId: user.organizationId,
          announcementId: ctx.params.id,
          channel,
          requestedBy: user.id,
          filters: audience,
        })
      )
    }
    return ctx.response.ok({ data: { channels: results } })
  }
}
