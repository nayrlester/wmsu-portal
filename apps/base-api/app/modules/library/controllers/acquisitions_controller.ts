import type { HttpContext } from '@adonisjs/core/http'
import AcquisitionService from '#modules/library/services/acquisitions/acquisition_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import {
  listAcquisitionsValidator,
  createAcquisitionValidator,
  updateAcquisitionValidator,
  cancelAcquisitionValidator,
  acknowledgeAcquisitionValidator,
  catalogAcquisitionValidator,
} from '#modules/library/validators/acquisition'

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

export default class AcquisitionsController {
  private service = new AcquisitionService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async dashboard(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:read')
    const data = await this.service.dashboard()
    return ctx.response.ok({ success: true, data })
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:read')
    const filters = await ctx.request.validateUsing(listAcquisitionsValidator)
    const page = await this.service.list(filters)
    return ctx.response.ok({
      success: true,
      data: page.all().map((row) => this.service.serialize(row)),
      meta: {
        total: page.total,
        perPage: page.perPage,
        currentPage: page.currentPage,
        lastPage: page.lastPage,
      },
    })
  }

  async show(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:read')
    const row = await this.service.findById(ctx.params.id)
    return ctx.response.ok({ success: true, data: this.service.serialize(row) })
  }

  async store(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:create')
    const payload = await ctx.request.validateUsing(createAcquisitionValidator)
    const row = await this.service.create(payload, ctx.authUser!.id, auditFromCtx(ctx))
    return ctx.response.created({
      success: true,
      message: 'Acquisition request created',
      data: this.service.serialize(row),
    })
  }

  async update(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:update')
    const payload = await ctx.request.validateUsing(updateAcquisitionValidator)
    const row = await this.service.update(ctx.params.id, payload, auditFromCtx(ctx))
    return ctx.response.ok({
      success: true,
      message: 'Acquisition request updated',
      data: this.service.serialize(row),
    })
  }

  async submit(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:submit')
    const row = await this.service.submit(ctx.params.id, ctx.authUser!.id, auditFromCtx(ctx))
    return ctx.response.ok({
      success: true,
      message: 'Acquisition request submitted',
      data: this.service.serialize(row),
    })
  }

  async route(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:route')
    const row = await this.service.routeToProcurement(
      ctx.params.id,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({
      success: true,
      message: 'Acquisition request queued for UFMS procurement (INT-LIB-07)',
      data: this.service.serialize(row),
    })
  }

  async acknowledge(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:route')
    const payload = await ctx.request.validateUsing(acknowledgeAcquisitionValidator)
    const row = await this.service.acknowledgeProcurementRef(
      ctx.params.id,
      payload.ufmsPrRef,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({
      success: true,
      message: 'UFMS procurement reference recorded',
      data: this.service.serialize(row),
    })
  }

  async linkCatalog(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:catalog')
    const payload = await ctx.request.validateUsing(catalogAcquisitionValidator)
    const row = await this.service.linkCatalog(
      ctx.params.id,
      payload.catalogedBookId,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({
      success: true,
      message: 'Catalog record linked to acquisition request',
      data: this.service.serialize(row),
    })
  }

  async cancel(ctx: HttpContext) {
    this.ensure(ctx, 'acquisitions:cancel')
    const payload = await ctx.request.validateUsing(cancelAcquisitionValidator)
    const row = await this.service.cancel(
      ctx.params.id,
      ctx.authUser!.id,
      payload.reason,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({
      success: true,
      message: 'Acquisition request cancelled',
      data: this.service.serialize(row),
    })
  }
}
