import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import OpacService from '#modules/library/services/opac/opac_service'

const searchValidator = vine.compile(
  vine.object({
    q: vine.string().trim().maxLength(200).optional(),
    title: vine.string().trim().maxLength(200).optional(),
    author: vine.string().trim().maxLength(200).optional(),
    subject: vine.string().trim().maxLength(200).optional(),
    callNumber: vine.string().trim().maxLength(100).optional(),
    year: vine.number().min(1000).max(9999).optional(),
    isbn: vine.string().trim().maxLength(40).optional(),
    language: vine.string().trim().maxLength(40).optional(),
    resourceType: vine.enum(['physical', 'digital', 'all']).optional(),
    availability: vine.enum(['available', 'any']).optional(),
    page: vine.number().min(1).optional(),
    // Public catalog stays small to limit scraping / load
    perPage: vine.number().min(1).max(25).optional(),
  })
)

/** Public OPAC — tenant-scoped, no JWT required. */
export default class PublicOpacController {
  private service = new OpacService()

  async search(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(searchValidator)
    const result = await this.service.search(filters)
    return ctx.response.ok({ success: true, data: result.data, meta: result.meta })
  }

  async show(ctx: HttpContext) {
    if (!this.isUuid(ctx.params.id)) {
      return ctx.response.badRequest({ success: false, message: 'Invalid book id' })
    }
    const book = await this.service.show(ctx.params.id)
    return ctx.response.ok({ success: true, data: book })
  }

  async cite(ctx: HttpContext) {
    if (!this.isUuid(ctx.params.id)) {
      return ctx.response.badRequest({ success: false, message: 'Invalid book id' })
    }
    const book = await this.service.show(ctx.params.id)
    return ctx.response.ok({ success: true, data: book.citations })
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value ?? ''
    )
  }
}
