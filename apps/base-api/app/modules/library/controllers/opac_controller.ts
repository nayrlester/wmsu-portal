import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import OpacService from '#modules/library/services/opac/opac_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'

const searchValidator = vine.compile(
  vine.object({
    q: vine.string().trim().optional(),
    title: vine.string().trim().optional(),
    author: vine.string().trim().optional(),
    subject: vine.string().trim().optional(),
    callNumber: vine.string().trim().optional(),
    year: vine.number().optional(),
    isbn: vine.string().trim().maxLength(40).optional(),
    resourceType: vine.enum(['physical', 'digital', 'all']).optional(),
    availability: vine.enum(['available', 'any']).optional(),
    language: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)

export default class OpacController {
  private service = new OpacService()
  private rbac = new RbacService()

  private ensureSearch(ctx: HttpContext) {
    // OPAC may be used by staff or members with search permission
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'search:query')) {
      throw new ForbiddenException('Missing permission: search:query')
    }
  }

  async search(ctx: HttpContext) {
    this.ensureSearch(ctx)
    const filters = await ctx.request.validateUsing(searchValidator)
    const result = await this.service.search(filters)
    return ctx.response.ok({ success: true, data: result.data, meta: result.meta })
  }

  async show(ctx: HttpContext) {
    this.ensureSearch(ctx)
    const book = await this.service.show(ctx.params.id)
    return ctx.response.ok({ success: true, data: book })
  }

  async cite(ctx: HttpContext) {
    this.ensureSearch(ctx)
    const book = await this.service.show(ctx.params.id)
    return ctx.response.ok({ success: true, data: book.citations })
  }
}
