import { auditLogRepository } from '#infrastructure/repositories/audit_log_repository'

export class AuditLogService {
  async list(options: { page?: number; limit?: number; cursor?: string; documentId?: string }) {
    const result = await auditLogRepository.paginate(options)
    const users = await auditLogRepository.hydrateUsers(result.data)

    return {
      logs: result.data.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        metadata: log.metadata,
        createdAt: log.createdAt,
        user: log.userId
          ? {
              id: log.userId,
              fullName: users.get(log.userId)?.fullName ?? null,
              email: users.get(log.userId)?.email ?? null,
            }
          : null,
      })),
      meta: result.meta,
    }
  }
}

export const auditLogService = new AuditLogService()
