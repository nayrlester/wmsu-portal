import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'

export type AuditWrite = {
  actorType?: string
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  beforeData?: unknown
  afterData?: unknown
  requestId?: string | null
}

export async function writeMdmAudit(entry: AuditWrite) {
  await db.table('mdm_audit_logs').insert({
    id: randomUUID(),
    actor_type: entry.actorType ?? 'admin',
    actor_id: entry.actorId ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    before_data: entry.beforeData ?? null,
    after_data: entry.afterData ?? null,
    request_id: entry.requestId ?? null,
    created_at: new Date(),
  })
}
