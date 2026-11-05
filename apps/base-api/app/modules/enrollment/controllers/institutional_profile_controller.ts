import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { institutionalProfileService } from '#modules/enrollment/services/institutional_profile_service'

const updateValidator = vine.compile(
  vine.object({
    legalName: vine.string().trim().maxLength(255),
    displayName: vine.string().trim().maxLength(255).optional(),
    logoUrl: vine.string().trim().maxLength(512).optional(),
    signatories: vine.array(
      vine.object({
        role: vine.string().trim().maxLength(64),
        name: vine.string().trim().maxLength(255),
        title: vine.string().trim().maxLength(255).optional(),
      })
    ),
  })
)

export default class InstitutionalProfileController {
  async show(ctx: HttpContext) {
    const user = ctx.auth.user!
    const row = await institutionalProfileService.getOrCreate(user.organizationId)
    return ctx.response.ok({
      data: {
        legalName: row.legalName,
        displayName: row.displayName,
        logoUrl: row.logoUrl,
        signatories: row.signatories,
      },
    })
  }

  async update(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateValidator)
    const row = await institutionalProfileService.update({
      organizationId: user.organizationId,
      legalName: body.legalName,
      displayName: body.displayName ?? null,
      logoUrl: body.logoUrl ?? null,
      signatories: body.signatories,
      actorUserId: user.id,
    })
    return ctx.response.ok({
      data: {
        legalName: row.legalName,
        displayName: row.displayName,
        logoUrl: row.logoUrl,
        signatories: row.signatories,
      },
    })
  }
}
