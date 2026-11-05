import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { Queue } from 'bullmq'
import env from '#start/env'
import { writePlatformAudit } from '#services/platform_audit_service'

let queue: Queue | null = null

function getQueue() {
  if (!queue) {
    queue = new Queue(env.get('QUEUE_NAME') ?? 'wmsu-cis-jobs', {
      connection: {
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
        password: env.get('REDIS_PASSWORD'),
        maxRetriesPerRequest: null,
      },
    })
  }
  return queue
}

export async function enqueueNotification(input: {
  channel?: string
  templateCode?: string | null
  recipient: string
  subject?: string | null
  body: string
  metadata?: Record<string, unknown>
  idempotencyKey?: string | null
  actorId?: string | null
}) {
  if (input.idempotencyKey) {
    const existing = await db
      .from('cis_notifications')
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (existing) return { notification: existing, deduplicated: true as const }
  }

  const now = new Date()
  const row = {
    id: randomUUID(),
    channel: input.channel ?? 'in_app',
    template_code: input.templateCode ?? null,
    recipient: input.recipient,
    subject: input.subject ?? null,
    body: input.body,
    metadata: input.metadata ?? null,
    status: 'queued',
    idempotency_key: input.idempotencyKey ?? null,
    sent_at: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  }
  await db.table('cis_notifications').insert(row)
  await writePlatformAudit({
    actorId: input.actorId ?? null,
    action: 'notification.enqueue',
    entityType: 'cis_notifications',
    entityId: row.id,
    afterData: { channel: row.channel, recipient: row.recipient },
  })

  try {
    await getQueue().add(
      'notification.deliver',
      { notificationId: row.id },
      {
        jobId: input.idempotencyKey ? `notification:${input.idempotencyKey}` : undefined,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    )
  } catch (error) {
    await db
      .from('cis_notifications')
      .where('id', row.id)
      .update({
        status: 'failed',
        last_error: error instanceof Error ? error.message : 'queue enqueue failed',
        updated_at: new Date(),
      })
  }

  return { notification: row, deduplicated: false as const }
}
