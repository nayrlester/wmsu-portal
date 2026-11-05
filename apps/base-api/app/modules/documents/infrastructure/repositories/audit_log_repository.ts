import AuditLog from '#modules/documents/models/audit_log'
import User from '#modules/documents/models/user'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { decodeDocumentCursor, encodeDocumentCursor } from '#modules/documents/domain/documents/document_search'

export class AuditLogRepository {
  async paginate(options: { page?: number; limit?: number; cursor?: string; documentId?: string }) {
    const tenantId = tenantContext.requireTenantId()
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)

    const query = AuditLog.query().where('tenant_id', tenantId).orderBy('created_at', 'desc').orderBy('id', 'desc')

    if (options.documentId) {
      query.where((builder) => {
        builder
          .where((group) => {
            group.where('entity_type', 'document').where('entity_id', options.documentId!)
          })
          .orWhereRaw(`coalesce(new_values->>'documentId', metadata->>'documentId') = ?`, [
            options.documentId!,
          ])
      })
    }

    if (options.cursor) {
      const decoded = decodeDocumentCursor(options.cursor)
      if (decoded) {
        query.where((builder) => {
          builder
            .where('created_at', '<', decoded.createdAt)
            .orWhere((nested) => {
              nested.where('created_at', decoded.createdAt).where('id', '<', decoded.id)
            })
        })
      }
      const rows = await query.limit(limit + 1)
      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows
      const last = data[data.length - 1]
      return {
        data,
        meta: {
          perPage: limit,
          nextCursor: hasMore && last ? encodeDocumentCursor(last.createdAt.toISO()!, last.id) : null,
        },
      }
    }

    const page = Math.max(options.page ?? 1, 1)
    const paginator = await query.paginate(page, limit)
    return { data: paginator.all(), meta: paginator.getMeta() }
  }

  async archiveOlderThanMonths(months = 12): Promise<number> {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - months)
    const result = await AuditLog.query().where('created_at', '<', cutoff).delete()
    return Number(result[0] ?? 0)
  }

  async hydrateUsers(logs: AuditLog[]) {
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))] as string[]
    if (!userIds.length) return new Map<string, User>()
    const users = await User.query().whereIn('id', userIds).whereNull('deleted_at')
    return new Map(users.map((user) => [user.id, user]))
  }
}

export const auditLogRepository = new AuditLogRepository()
