import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import BorrowingService from '#modules/library/services/borrowing/borrowing_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import {
  listBorrowingsValidator,
  requestBorrowValidator,
  approveBorrowValidator,
  directCheckoutValidator,
  returnBorrowValidator,
} from '#modules/library/validators/borrowing'

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

const categoryRuleValidator = vine.object({
  loanPeriodDays: vine.number().min(1).max(365).optional(),
  renewalPeriodDays: vine.number().min(1).max(365).optional(),
  maxRenewals: vine.number().min(0).max(20).optional(),
  maxActiveBorrowings: vine.number().min(1).max(100).optional(),
})

const categoryLoanRulesValidator = vine.compile(
  vine.object({
    categories: vine.object({
      student: categoryRuleValidator.optional(),
      faculty: categoryRuleValidator.optional(),
      employee: categoryRuleValidator.optional(),
      alumni: categoryRuleValidator.optional(),
    }),
  })
)

export default class BorrowingsController {
  private borrowingService = new BorrowingService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  /** Staff circulation desk — students must use /portal APIs only. */
  private ensureStaffDesk(ctx: HttpContext) {
    const roles = ctx.authUser?.roles ?? []
    const perms = ctx.authUser?.permissions ?? []
    const student =
      roles.some((r) => r.toLowerCase() === 'student') ||
      (perms.includes('library.member') && !perms.includes('library.*') && !perms.includes('*'))
    if (student) {
      throw new ForbiddenException('Students may only use My Library portal for loans')
    }
  }

  async dashboard(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:read')
    this.ensureStaffDesk(ctx)
    const stats = await this.borrowingService.dashboardStats()

    return ctx.response.ok({ success: true, data: stats })
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:read')
    this.ensureStaffDesk(ctx)
    const filters = await ctx.request.validateUsing(listBorrowingsValidator)
    const paginator = await this.borrowingService.list(filters)

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((b) => this.borrowingService.serializeBorrowing(b)),
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    })
  }

  async show(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:read')
    this.ensureStaffDesk(ctx)
    const borrowing = await this.borrowingService.findById(ctx.params.id)

    return ctx.response.ok({
      success: true,
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }

  async events(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:read')
    this.ensureStaffDesk(ctx)
    const events = await this.borrowingService.listEvents(ctx.params.id)
    return ctx.response.ok({
      success: true,
      data: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        channel: e.channel,
        actorUserId: e.actorUserId,
        payload: e.payload,
        createdAt: e.createdAt.toISO(),
      })),
    })
  }

  async loanRules(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:read')
    this.ensureStaffDesk(ctx)
    const rules = await this.borrowingService.getLoanRules()
    return ctx.response.ok({
      success: true,
      message: 'Interim configurable circulation rules (official WMSU category tables For Clarification)',
      data: rules,
    })
  }

  async updateLoanRules(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(categoryLoanRulesValidator)
    const rules = await this.borrowingService.saveCategoryLoanRules(payload.categories, ctx.authUser?.id ?? null)
    return ctx.response.ok({
      success: true,
      message: 'Patron category loan rules saved. Official WMSU tables remain For Clarification.',
      data: rules,
    })
  }

  async request(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:request')
    const payload = await ctx.request.validateUsing(requestBorrowValidator)
    const borrowing = await this.borrowingService.request(payload, auditFromCtx(ctx))

    return ctx.response.created({
      success: true,
      message: 'Borrow request submitted',
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }

  async approve(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:approve')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(approveBorrowValidator)
    const borrowing = await this.borrowingService.approve(
      ctx.params.id,
      payload.copyId,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )

    return ctx.response.ok({
      success: true,
      message: 'Borrow request approved',
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }

  async checkout(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    this.ensureStaffDesk(ctx)
    const borrowing = await this.borrowingService.checkout(
      ctx.params.id,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )

    return ctx.response.ok({
      success: true,
      message: 'Book checked out',
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }

  async directCheckout(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(directCheckoutValidator)
    const borrowing = await this.borrowingService.directCheckout(
      payload,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )

    return ctx.response.created({
      success: true,
      message: 'Book checked out',
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }

  async batchCheckout(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          cardNumber: vine.string().trim().minLength(3).maxLength(100),
          barcodes: vine.array(vine.string().trim().minLength(2).maxLength(100)).minLength(1).maxLength(20),
        })
      )
    )
    const data = await this.borrowingService.batchDesk(
      'checkout',
      payload.barcodes,
      ctx.authUser!.id,
      payload.cardNumber,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({ success: true, data })
  }

  async batchCheckin(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:return')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          barcodes: vine.array(vine.string().trim().minLength(2).maxLength(100)).minLength(1).maxLength(20),
        })
      )
    )
    const data = await this.borrowingService.batchDesk(
      'checkin',
      payload.barcodes,
      ctx.authUser!.id,
      undefined,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({ success: true, data })
  }

  async return(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:return')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(returnBorrowValidator)
    const borrowing = await this.borrowingService.return(
      ctx.params.id,
      ctx.authUser!.id,
      payload.notes,
      auditFromCtx(ctx)
    )

    return ctx.response.ok({
      success: true,
      message: 'Book returned',
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }

  async renew(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:renew')
    const borrowing = await this.borrowingService.renew(ctx.params.id, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      message: 'Loan renewed',
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }

  async markLost(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:mark_lost')
    this.ensureStaffDesk(ctx)
    const borrowing = await this.borrowingService.markLost(
      ctx.params.id,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )

    return ctx.response.ok({
      success: true,
      message: 'Book marked as lost',
      data: this.borrowingService.serializeBorrowing(borrowing),
    })
  }
}
