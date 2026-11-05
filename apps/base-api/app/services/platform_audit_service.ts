import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'

export async function writePlatformAudit(input: {
  actorType?: string
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  beforeData?: unknown
  afterData?: unknown
  correlationId?: string | null
}) {
  await db.table('cis_audit_logs').insert({
    id: randomUUID(),
    actor_type: input.actorType ?? 'system',
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    correlation_id: input.correlationId ?? null,
    created_at: new Date(),
  })
}
