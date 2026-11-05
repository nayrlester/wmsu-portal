import type { HttpContext } from '@adonisjs/core/http'
import { auditLogService } from '#modules/documents/services/audit_log_service'
import { auditService } from '#modules/documents/services/audit_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export default class AuditLogsController {
  async index({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 25))
    const cursor = request.input('cursor') as string | undefined
    const documentId = request.input('documentId') as string | undefined

    const result = await auditLogService.list({ page, limit, cursor, documentId })
    return response.ok(result)
  }

  async verifyChain({ request, response }: HttpContext) {
    const tenantId = tenantContext.getTenantId() ?? null
    const limit = Math.min(Number(request.input('limit', 500)), 2000)
    const result = await auditService.verifyChain(tenantId, limit)
    return response.ok(result)
  }
}
