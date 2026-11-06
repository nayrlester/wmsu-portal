import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import vine from '@vinejs/vine'
import { createReadStream, existsSync } from 'node:fs'
import { join } from 'node:path'
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

  async uploadLogo(ctx: HttpContext) {
    const user = ctx.auth.user!
    const logo = ctx.request.file('logo', {
      size: '2mb',
      extnames: ['png', 'jpg', 'jpeg', 'webp'],
    })
    if (!logo) {
      return ctx.response.badRequest({ error: 'Choose a logo image to upload' })
    }
    try {
      const row = await institutionalProfileService.storeLogo(user.organizationId, logo, user.id)
      return ctx.response.ok({
        data: {
          legalName: row.legalName,
          displayName: row.displayName,
          logoUrl: row.logoUrl,
          signatories: row.signatories,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logo upload failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async showLogo(ctx: HttpContext) {
    const organizationId = String(ctx.params.organizationId ?? '')
    const filename = String(ctx.params.filename ?? '')
    if (
      !/^[0-9a-f-]{36}$/i.test(organizationId) ||
      !/^logo-[0-9a-f-]{36}\.(png|jpe?g|webp)$/i.test(filename)
    ) {
      return ctx.response.notFound({ error: 'Logo not found' })
    }
    const filePath = join(app.makePath('storage/enrollment-logos'), organizationId, filename)
    if (!existsSync(filePath)) {
      return ctx.response.notFound({ error: 'Logo not found' })
    }
    const ext = filename.split('.').pop()?.toLowerCase()
    const type =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    ctx.response.header('Content-Type', type)
    ctx.response.header('Cache-Control', 'public, max-age=3600')
    return ctx.response.stream(createReadStream(filePath))
  }
}
