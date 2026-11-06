import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import DigitalService from '#modules/library/services/digital/digital_service'

const searchValidator = vine.compile(
  vine.object({
    q: vine.string().trim().maxLength(200).optional(),
    author: vine.string().trim().maxLength(200).optional(),
    subject: vine.string().trim().maxLength(200).optional(),
    year: vine.number().min(1000).max(9999).optional(),
  })
)

export default class PublicElibraryController {
  private service = new DigitalService()

  async search(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(searchValidator)
    if (!filters.q && !filters.author && !filters.subject && !filters.year) {
      return ctx.response.badRequest({
        success: false,
        message: 'Enter a keyword, author, subject, or year.',
      })
    }
    const data = await this.service.portalSearch(filters)
    return ctx.response.ok({ success: true, data })
  }

  async openRepository(ctx: HttpContext) {
    if (!this.isUuid(ctx.params.id)) {
      return ctx.response.badRequest({ success: false, message: 'Invalid item id' })
    }
    const mode = ctx.request.input('mode', 'view') === 'download' ? 'download' : 'view'
    const item = await this.service.accessRepositoryItem(ctx.params.id, mode)
    return ctx.response.ok({ success: true, data: this.service.serializeRepo(item) })
  }

  async openElectronic(ctx: HttpContext) {
    if (!this.isUuid(ctx.params.id)) {
      return ctx.response.badRequest({ success: false, message: 'Invalid resource id' })
    }
    const item = await this.service.openElectronicResource(ctx.params.id)
    return ctx.response.ok({ success: true, data: this.service.serializeEresource(item) })
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value ?? ''
    )
  }
}
