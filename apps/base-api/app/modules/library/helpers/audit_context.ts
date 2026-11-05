import type { HttpContext } from '@adonisjs/core/http'
import type { AuditContext } from '#modules/library/services/audit/audit_service'

export function auditFromCtx(ctx: HttpContext): AuditContext {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.requestId,
  }
}
