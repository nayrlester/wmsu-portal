import type { HttpContext } from '@adonisjs/core/http'
import FineService from '#modules/library/services/fines/fine_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import {
  listFinesValidator,
  createManualFineValidator,
  adjustFineValidator,
  waiveFineValidator,
  recordPaymentValidator,
} from '#modules/library/validators/fine'

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

export default class FinesController {
  private fineService = new FineService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async summary(ctx: HttpContext) {
    this.ensure(ctx, 'fines:read')
    const summary = await this.fineService.summary()

    return ctx.response.ok({ success: true, data: summary })
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx, 'fines:read')
    const filters = await ctx.request.validateUsing(listFinesValidator)
    const paginator = await this.fineService.list(filters)

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((f) => this.fineService.serializeFine(f)),
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    })
  }

  async show(ctx: HttpContext) {
    this.ensure(ctx, 'fines:read')
    const fine = await this.fineService.findById(ctx.params.id)

    return ctx.response.ok({
      success: true,
      data: this.fineService.serializeFine(fine),
    })
  }

  async store(ctx: HttpContext) {
    this.ensure(ctx, 'fines:adjust')
    const payload = await ctx.request.validateUsing(createManualFineValidator)
    const fine = await this.fineService.createManual(payload, auditFromCtx(ctx))

    return ctx.response.created({
      success: true,
      message: 'Manual fine created',
      data: this.fineService.serializeFine(fine),
    })
  }

  async adjust(ctx: HttpContext) {
    this.ensure(ctx, 'fines:adjust')
    const payload = await ctx.request.validateUsing(adjustFineValidator)
    const fine = await this.fineService.adjust(ctx.params.id, payload, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      message: 'Fine adjusted',
      data: this.fineService.serializeFine(fine),
    })
  }

  async waive(ctx: HttpContext) {
    this.ensure(ctx, 'fines:waive')
    const payload = await ctx.request.validateUsing(waiveFineValidator)
    const fine = await this.fineService.waive(
      ctx.params.id,
      payload,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )

    return ctx.response.ok({
      success: true,
      message: 'Fine waived',
      data: this.fineService.serializeFine(fine),
    })
  }

  async collect(ctx: HttpContext) {
    this.ensure(ctx, 'fines:collect')
    const payload = await ctx.request.validateUsing(recordPaymentValidator)
    const fine = await this.fineService.recordPayment(
      ctx.params.id,
      payload,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )

    return ctx.response.ok({
      success: true,
      message: 'Payment recorded',
      data: this.fineService.serializeFine(fine),
    })
  }

  async payments(ctx: HttpContext) {
    this.ensure(ctx, 'fines:read')
    const payments = await this.fineService.getPayments(ctx.params.id)

    return ctx.response.ok({ success: true, data: payments })
  }
}
