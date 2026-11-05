import { randomUUID } from 'node:crypto'
import { Queue } from 'bullmq'
import db from '@adonisjs/lucid/services/db'
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

export type PublishDomainEventInput = {
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  idempotencyKey: string
  actorId?: string | null
}

export async function publishDomainEvent(input: PublishDomainEventInput) {
  const existing = await db
    .from('cis_domain_events')
    .where('idempotency_key', input.idempotencyKey)
    .first()
  if (existing) {
    return { event: existing, deduplicated: true as const }
  }

  const now = new Date()
  const event = {
    id: randomUUID(),
    event_type: input.eventType,
    aggregate_type: input.aggregateType,
    aggregate_id: input.aggregateId,
    idempotency_key: input.idempotencyKey,
    payload: input.payload,
    status: 'pending',
    attempt_count: 0,
    max_attempts: 5,
    available_at: now,
    processed_at: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  }

  await db.table('cis_domain_events').insert(event)
  await writePlatformAudit({
    actorId: input.actorId ?? null,
    action: 'domain_event.publish',
    entityType: 'cis_domain_events',
    entityId: event.id,
    afterData: { eventType: event.event_type, aggregateId: event.aggregate_id },
  })

  try {
    await getQueue().add(
      'domain.event.dispatch',
      { eventId: event.id, eventType: event.event_type },
      {
        jobId: `domain-event:${event.id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 100,
      }
    )
  } catch (error) {
    await db
      .from('cis_domain_events')
      .where('id', event.id)
      .update({
        last_error: error instanceof Error ? error.message : 'queue enqueue failed',
        updated_at: new Date(),
      })
  }

  return { event, deduplicated: false as const }
}

export async function listSubscriptions(eventType?: string) {
  const q = db.from('cis_event_subscriptions').where('enabled', true).orderBy('subscriber_code', 'asc')
  if (eventType) q.where('event_type', eventType)
  return q
}
