import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import DigitalService from '#modules/library/services/digital/digital_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'

const repoCreateValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(500),
    resourceType: vine.enum([
      'thesis',
      'dissertation',
      'faculty_publication',
      'research_report',
      'multimedia',
      'conference_paper',
      'institutional_document',
      'ebook',
      'other',
    ]),
    authors: vine.string().trim().optional(),
    subjects: vine.string().trim().optional(),
    publicationYear: vine.number().optional(),
    abstract: vine.string().trim().optional(),
    accessLevel: vine.string().trim().optional(),
    fileUrl: vine.string().trim().optional(),
  })
)

const eresourceValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(500),
    resourceKind: vine.enum(['ebook', 'ejournal', 'database', 'open_access', 'multimedia', 'other']),
    provider: vine.string().trim().optional(),
    accessUrl: vine.string().trim().optional(),
    authMethod: vine.string().trim().optional(),
  })
)

export default class DigitalController {
  private service = new DigitalService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async listRepository(ctx: HttpContext) {
    this.ensure(ctx, 'digital:read')
    const paginator = await this.service.listRepository({
      q: ctx.request.input('q'),
      resourceType: ctx.request.input('resourceType'),
      page: Number(ctx.request.input('page', 1)),
      perPage: Number(ctx.request.input('perPage', 25)),
    })

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((i) => this.service.serializeRepo(i)),
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    })
  }

  async createRepository(ctx: HttpContext) {
    this.ensure(ctx, 'digital:create')
    const payload = await ctx.request.validateUsing(repoCreateValidator)
    const item = await this.service.createRepositoryItem(payload)
    return ctx.response.created({ success: true, data: this.service.serializeRepo(item) })
  }

  async accessRepository(ctx: HttpContext) {
    this.ensure(ctx, 'digital:access')
    const mode = ctx.request.input('mode', 'view') === 'download' ? 'download' : 'view'
    const item = await this.service.accessRepositoryItem(ctx.params.id, mode)
    return ctx.response.ok({ success: true, data: this.service.serializeRepo(item) })
  }

  async listElectronic(ctx: HttpContext) {
    this.ensure(ctx, 'digital:read')
    const items = await this.service.listElectronicResources()
    return ctx.response.ok({
      success: true,
      data: items.map((i) => this.service.serializeEresource(i)),
    })
  }

  async createElectronic(ctx: HttpContext) {
    this.ensure(ctx, 'digital:create')
    const payload = await ctx.request.validateUsing(eresourceValidator)
    const item = await this.service.createElectronicResource(payload)
    return ctx.response.created({ success: true, data: this.service.serializeEresource(item) })
  }

  async unifiedSearch(ctx: HttpContext) {
    this.ensure(ctx, 'digital:read')
    const q = String(ctx.request.input('q', '')).trim()
    if (!q) return ctx.response.badRequest({ success: false, message: 'q is required' })
    const data = await this.service.unifiedSearch(q)
    return ctx.response.ok({ success: true, data })
  }
}
