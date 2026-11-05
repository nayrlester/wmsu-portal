import { createHash } from 'node:crypto'

export interface AuditChainPayload {
  tenantId: string | null
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAtIso: string
}

/** Canonical SHA-256 for append-only audit chain verification. */
export function computeAuditEntryHash(prevHash: string | null, payload: AuditChainPayload): string {
  const canonical = JSON.stringify({
    prev: prevHash ?? 'GENESIS',
    tenantId: payload.tenantId,
    userId: payload.userId,
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId,
    oldValues: payload.oldValues,
    newValues: payload.newValues,
    metadata: payload.metadata,
    createdAt: payload.createdAtIso,
  })
  return createHash('sha256').update(canonical).digest('hex')
}
