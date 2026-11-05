import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import CatalogImportService from '#modules/library/services/catalog/catalog_import_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

export default class CatalogImportController {
  private service = new CatalogImportService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'books:create')) {
      throw new ForbiddenException('Missing permission: books:create')
    }
  }

  async importCsv(ctx: HttpContext) {
    this.ensure(ctx)
    const payload = await ctx.request.validateUsing(
      vine.compile(vine.object({ csv: vine.string().minLength(1) }))
    )
    const result = await this.service.importCsv(payload.csv, ctx.authUser!.id, auditFromCtx(ctx))
    return ctx.response.created({ success: true, data: result })
  }

  async importMarc(ctx: HttpContext) {
    this.ensure(ctx)
    const payload = await ctx.request.validateUsing(
      vine.compile(vine.object({ records: vine.array(vine.any()) }))
    )
    const result = await this.service.importMarcJson(
      payload.records as Array<Record<string, unknown>>,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )
    return ctx.response.created({ success: true, data: result })
  }

  async importXlsx(ctx: HttpContext) {
    this.ensure(ctx)
    const payload = await ctx.request.validateUsing(
      vine.compile(vine.object({ base64: vine.string().minLength(1) }))
    )
    const result = await this.service.importXlsxBase64(
      payload.base64,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )
    return ctx.response.created({ success: true, data: result })
  }

  async versions(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'books:read')) {
      throw new ForbiddenException('Missing permission: books:read')
    }
    const versions = await this.service.versions(ctx.params.id)
    return ctx.response.ok({
      success: true,
      data: versions.map((v) => ({
        id: v.id,
        version: v.version,
        snapshot: v.snapshot,
        changedBy: v.changedBy,
        createdAt: v.createdAt.toISO(),
      })),
    })
  }
}
