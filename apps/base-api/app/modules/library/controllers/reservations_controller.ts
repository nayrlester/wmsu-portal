import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ReservationService from '#modules/library/services/reservations/reservation_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'

const listValidator = vine.compile(
  vine.object({
    status: vine.enum(['pending', 'ready', 'fulfilled', 'cancelled', 'expired']).optional(),
    memberId: vine.string().uuid().optional(),
    bookId: vine.string().uuid().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)

const createValidator = vine.compile(
  vine.object({
    memberId: vine.string().uuid(),
    bookId: vine.string().uuid(),
    reservedAt: vine.string().trim().optional(),
    expiresAt: vine.string().trim().optional(),
  })
)

const cancelValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().maxLength(500).optional(),
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

export default class ReservationsController {
  private service = new ReservationService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  /** Staff holds desk — students must use /portal reservation APIs. */
  private ensureStaffDesk(ctx: HttpContext) {
    const roles = ctx.authUser?.roles ?? []
    const perms = ctx.authUser?.permissions ?? []
    const student =
      roles.some((r) => r.toLowerCase() === 'student') ||
      (perms.includes('library.member') && !perms.includes('library.*') && !perms.includes('*'))
    if (student) {
      throw new ForbiddenException('Students may only manage holds via My Library portal')
    }
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx, 'reservations:read')
    this.ensureStaffDesk(ctx)
    const filters = await ctx.request.validateUsing(listValidator)
    const paginator = await this.service.list(filters)
    const data = await Promise.all(
      paginator.all().map((r) => this.service.serializeWithRelations(r))
    )

    return ctx.response.ok({
      success: true,
      data,
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    })
  }

  async store(ctx: HttpContext) {
    this.ensure(ctx, 'reservations:create')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(createValidator)
    const reservation = await this.service.create(
      payload.memberId,
      payload.bookId,
      auditFromCtx(ctx),
      {
        reservedAt: payload.reservedAt,
        expiresAt: payload.expiresAt,
      }
    )

    return ctx.response.created({
      success: true,
      message: 'Reservation created',
      data: await this.service.serializeWithRelations(reservation),
    })
  }

  async cancel(ctx: HttpContext) {
    this.ensure(ctx, 'reservations:cancel')
    this.ensureStaffDesk(ctx)
    const payload = await ctx.request.validateUsing(cancelValidator)
    const reservation = await this.service.cancel(ctx.params.id, payload.reason, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      message: 'Reservation cancelled',
      data: await this.service.serializeWithRelations(reservation),
    })
  }

  async fulfill(ctx: HttpContext) {
    this.ensure(ctx, 'reservations:fulfill')
    this.ensureStaffDesk(ctx)
    const reservation = await this.service.fulfill(ctx.params.id, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      message: 'Reservation fulfilled',
      data: await this.service.serializeWithRelations(reservation),
    })
  }
}
