import type { HttpContext } from '@adonisjs/core/http'
import AttendanceService from '#modules/library/services/attendance/attendance_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import {
  createAttendanceEventValidator,
  listAttendanceEventsValidator,
} from '#modules/library/validators/attendance'

export default class AttendanceController {
  private attendanceService = new AttendanceService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  private ensurePost(ctx: HttpContext) {
    const perms = ctx.authUser?.permissions ?? []
    const allowed =
      this.rbac.hasPermission(perms, 'members:update') ||
      this.rbac.hasPermission(perms, 'settings:update')
    if (!ctx.authUser || !allowed) {
      throw new ForbiddenException('Missing permission: members:update or settings:update')
    }
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx, 'members:read')
    const filters = await ctx.request.validateUsing(listAttendanceEventsValidator)
    const paginator = await this.attendanceService.list(filters)

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((e) => this.attendanceService.serialize(e)),
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    })
  }

  async summary(ctx: HttpContext) {
    this.ensure(ctx, 'members:read')
    const summary = await this.attendanceService.todaySummary()
    return ctx.response.ok({ success: true, data: summary })
  }

  async store(ctx: HttpContext) {
    this.ensurePost(ctx)
    const payload = await ctx.request.validateUsing(createAttendanceEventValidator)
    const event = await this.attendanceService.create(payload)

    return ctx.response.created({
      success: true,
      message: 'Attendance event logged',
      data: this.attendanceService.serialize(event),
    })
  }
}
