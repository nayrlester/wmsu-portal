import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#modules/enrollment/models/audit_log'

export default class AuditLogsController {
  async index({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = Math.min(Number(request.input('limit', 50)) || 50, 100)
    const entityType = request.input('entityType')
    const entityId = request.input('entityId')
    const query = AuditLog.query().where('organizationId', auth.user!.organizationId)
    if (typeof entityType === 'string' && entityType.trim()) {
      query.where('entityType', entityType.trim())
    }
    if (typeof entityId === 'string' && entityId.trim()) {
      query.where('entityId', entityId.trim())
    }
    const result = await query.preload('actor').orderBy('createdAt', 'desc').paginate(page, limit)
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }
}
