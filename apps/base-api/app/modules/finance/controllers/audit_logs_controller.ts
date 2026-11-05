import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#modules/finance/models/audit_log'

export default class AuditLogsController {
  async index({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 50)
    const result = await AuditLog.query()
      .where('organizationId', auth.user!.organizationId)
      .preload('actor')
      .orderBy('createdAt', 'desc')
      .paginate(page, limit)
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }
}
