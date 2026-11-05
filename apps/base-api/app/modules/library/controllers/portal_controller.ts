import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PortalService from '#modules/library/services/portal/portal_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'

const reserveValidator = vine.compile(
  vine.object({
    bookId: vine.string().uuid(),
  })
)

const readingListValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(200),
    description: vine.string().trim().maxLength(1000).optional(),
  })
)

const readingListItemValidator = vine.compile(
  vine.object({
    bookId: vine.string().uuid(),
  })
)

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

export default class PortalController {
  private service = new PortalService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext) {
    if (!ctx.authUser) throw new ForbiddenException('Authentication required')
  }

  private async member(ctx: HttpContext) {
    this.ensure(ctx)
    return this.service.resolveMemberForUser(ctx.authUser!.id, ctx.authUser!.email)
  }

  async me(ctx: HttpContext) {
    const member = await this.member(ctx)
    const status = await this.service.accountStatus(member)
    return ctx.response.ok({ success: true, data: status })
  }

  async renew(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'borrowings:renew')) {
      throw new ForbiddenException('Missing permission: borrowings:renew')
    }
    const member = await this.member(ctx)
    const borrowing = await this.service.renewLoan(member.id, ctx.params.id, auditFromCtx(ctx))
    return ctx.response.ok({
      success: true,
      message: 'Loan renewed',
      data: await this.service.serializeLoan(borrowing),
    })
  }

  async reserve(ctx: HttpContext) {
    const perms = ctx.authUser?.permissions ?? []
    const canReserve =
      this.rbac.hasPermission(perms, 'reservations:create') ||
      this.rbac.hasPermission(perms, 'portal:access') ||
      this.rbac.hasPermission(perms, 'library.member')
    if (!ctx.authUser || !canReserve) {
      throw new ForbiddenException('Missing permission to place a hold')
    }
    const member = await this.member(ctx)
    const payload = await ctx.request.validateUsing(reserveValidator)
    const reservation = await this.service.reserve(member.id, payload.bookId, auditFromCtx(ctx))
    return ctx.response.created({ success: true, data: reservation })
  }

  async readingLists(ctx: HttpContext) {
    const member = await this.member(ctx)
    const lists = await this.service.listReadingLists(member.id)
    return ctx.response.ok({ success: true, data: lists })
  }

  async createReadingList(ctx: HttpContext) {
    const member = await this.member(ctx)
    const payload = await ctx.request.validateUsing(readingListValidator)
    const list = await this.service.createReadingList(member.id, payload.name, payload.description)
    return ctx.response.created({ success: true, data: list })
  }

  async addReadingListItem(ctx: HttpContext) {
    const member = await this.member(ctx)
    const payload = await ctx.request.validateUsing(readingListItemValidator)
    const list = await this.service.addReadingListItem(member.id, ctx.params.id, payload.bookId)
    return ctx.response.ok({ success: true, data: list })
  }

  async deleteReadingList(ctx: HttpContext) {
    const member = await this.member(ctx)
    await this.service.deleteReadingList(member.id, ctx.params.id)
    return ctx.response.ok({ success: true, message: 'Reading list deleted' })
  }

  async removeReadingListItem(ctx: HttpContext) {
    const member = await this.member(ctx)
    const list = await this.service.removeReadingListItem(
      member.id,
      ctx.params.id,
      ctx.params.itemId
    )
    return ctx.response.ok({ success: true, data: list })
  }
}
