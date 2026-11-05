import type { HttpContext } from '@adonisjs/core/http'
import SearchService from '#modules/library/services/search/search_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { createSavedSearchValidator, searchQueryValidator } from '#modules/library/validators/search'

export default class SearchController {
  private searchService = new SearchService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'search:query')) {
      throw new ForbiddenException('Missing permission: search:query')
    }
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx)
    const filters = await ctx.request.validateUsing(searchQueryValidator)

    const result = await this.searchService.search({
      ...filters,
      userId: ctx.authUser!.id,
    })

    return ctx.response.ok({
      success: true,
      data: result.items,
      facets: result.facets,
      meta: result.meta,
    })
  }

  async recent(ctx: HttpContext) {
    this.ensure(ctx)
    const items = await this.searchService.listRecent(ctx.authUser!.id)

    return ctx.response.ok({ success: true, data: items })
  }

  async saved(ctx: HttpContext) {
    this.ensure(ctx)
    const items = await this.searchService.listSaved(ctx.authUser!.id)

    return ctx.response.ok({ success: true, data: items })
  }

  async storeSaved(ctx: HttpContext) {
    this.ensure(ctx)
    const payload = await ctx.request.validateUsing(createSavedSearchValidator)

    const saved = await this.searchService.createSaved(
      ctx.authUser!.id,
      payload.name,
      payload.query ?? '',
      payload.filters ?? {}
    )

    return ctx.response.created({
      success: true,
      message: 'Search saved',
      data: saved,
    })
  }

  async destroySaved(ctx: HttpContext) {
    this.ensure(ctx)
    await this.searchService.deleteSaved(ctx.authUser!.id, ctx.params.id)

    return ctx.response.ok({ success: true, message: 'Saved search deleted' })
  }
}
