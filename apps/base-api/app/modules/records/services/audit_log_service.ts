import AuditLog from '#modules/records/models/audit_log'

interface LogInput {
  organizationId: string
  actorUserId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

class AuditLogService {
  async log(input: LogInput): Promise<void> {
    await AuditLog.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
    })
  }
}

export const auditLogService = new AuditLogService()
