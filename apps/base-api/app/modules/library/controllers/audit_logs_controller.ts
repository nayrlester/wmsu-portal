import type { HttpContext } from '@adonisjs/core/http'
import AuditService from '#modules/library/services/audit/audit_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { listAuditLogsValidator } from '#modules/library/validators/audit'
import type { AuditAction } from '#modules/library/models/audit_log'

export default class AuditLogsController {
  private auditService = new AuditService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'audit:read')) {
      throw new ForbiddenException('Missing permission: audit:read')
    }
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx)
    const filters = await ctx.request.validateUsing(listAuditLogsValidator)

    const paginator = await this.auditService.list({
      ...filters,
      action: filters.action as AuditAction | undefined,
    })

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.userEmail,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        requestId: log.requestId,
        createdAt: log.createdAt.toISO(),
      })),
      meta: paginator.getMeta(),
    })
  }
}
