import { config as loadDotenv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotenv({ path: resolve(__dirname, '../../../.env') })
loadDotenv({ path: resolve(__dirname, '../.env') })

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380'
const queueName = process.env.QUEUE_NAME ?? 'wmsu-cis-jobs'
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://wmsu:wmsu_dev_change_me@127.0.0.1:5433/wmsu_cis'

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
})

const pool = new pg.Pool({ connectionString: databaseUrl })

async function verifyConnections() {
  const redisPong = await connection.ping()
  const db = await pool.query('select 1 as ok')
  console.log(`[worker] redis=${redisPong} postgres=${db.rows[0]?.ok === 1 ? 'ok' : 'fail'}`)
}

await verifyConnections()

async function markEvent(eventId: string, patch: Record<string, unknown>) {
  const keys = Object.keys(patch)
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  await pool.query(`update cis_domain_events set ${sets}, updated_at = now() where id = $1`, [
    eventId,
    ...keys.map((k) => patch[k]),
  ])
}

async function dispatchDomainEvent(eventId: string) {
  const { rows } = await pool.query(`select * from cis_domain_events where id = $1`, [eventId])
  const event = rows[0]
  if (!event) return { skipped: true, reason: 'missing' }
  if (event.status === 'processed') return { skipped: true, reason: 'already_processed' }

  await markEvent(eventId, {
    status: 'processing',
    attempt_count: Number(event.attempt_count ?? 0) + 1,
  })

  const subs = await pool.query(
    `select * from cis_event_subscriptions
     where enabled = true and event_type = $1
     order by subscriber_code asc`,
    [event.event_type]
  )

  for (const sub of subs.rows) {
    if (sub.handler_name === 'audit.mirror') {
      await pool.query(
        `insert into cis_audit_logs
          (id, actor_type, actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id, created_at)
         values (gen_random_uuid(), 'subscriber', $1, $2, $3, $4, null, $5::jsonb, $6, now())`,
        [
          sub.subscriber_code,
          `event.${event.event_type}`,
          event.aggregate_type,
          event.aggregate_id,
          JSON.stringify(event.payload ?? {}),
          event.id,
        ]
      )
      continue
    }

    if (sub.handler_name === 'notification.echo') {
      await pool.query(
        `insert into cis_notifications
          (id, channel, template_code, recipient, subject, body, metadata, status, idempotency_key, sent_at, last_error, created_at, updated_at)
         values (gen_random_uuid(), 'in_app', 'DEV-EVENT-ECHO', $1, $2, $3, $4::jsonb, 'sent', $5, now(), null, now(), now())
         on conflict (idempotency_key) do nothing`,
        [
          `subscriber:${sub.subscriber_code}`,
          `Event ${event.event_type}`,
          `Processed domain event ${event.id}`,
          JSON.stringify({ eventId: event.id, subscriber: sub.subscriber_code }),
          `event-echo:${event.id}:${sub.subscriber_code}`,
        ]
      )
      continue
    }

    console.log(`[worker] no-op handler ${sub.handler_name} for ${event.event_type}`)
  }

  await markEvent(eventId, {
    status: 'processed',
    processed_at: new Date(),
    last_error: null,
  })
  return { processed: true, subscribers: subs.rowCount }
}

async function deliverNotification(notificationId: string) {
  const { rows } = await pool.query(`select * from cis_notifications where id = $1`, [notificationId])
  const row = rows[0]
  if (!row) return { skipped: true }
  if (row.status === 'sent') return { skipped: true, reason: 'already_sent' }

  await pool.query(
    `update cis_notifications
     set status = 'sent', sent_at = now(), last_error = null, updated_at = now()
     where id = $1`,
    [notificationId]
  )
  return { delivered: true, channel: row.channel }
}

const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name === 'infra.ping') {
      await pool.query(
        `insert into infra_health_checks (component, status, detail, checked_at, created_at)
         values ($1, $2, $3, now(), now())`,
        ['worker', 'ok', `processed job ${job.id}`]
      )
      return { processed: true, jobId: job.id }
    }

    if (job.name === 'domain.event.dispatch') {
      try {
        return await dispatchDomainEvent(String(job.data.eventId))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'dispatch failed'
        await markEvent(String(job.data.eventId), {
          status: 'failed',
          last_error: message,
        })
        throw error
      }
    }

    if (job.name === 'notification.deliver') {
      try {
        return await deliverNotification(String(job.data.notificationId))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'deliver failed'
        await pool.query(
          `update cis_notifications set status = 'failed', last_error = $2, updated_at = now() where id = $1`,
          [job.data.notificationId, message]
        )
        throw error
      }
    }

    return { skipped: true }
  },
  { connection }
)

worker.on('ready', () => {
  console.log(`[worker] listening on queue=${queueName}`)
})

worker.on('completed', (job) => {
  console.log(`[worker] completed ${job.name}#${job.id}`)
})

worker.on('failed', (job, error) => {
  console.error(`[worker] failed ${job?.name}#${job?.id}`, error.message)
})

async function shutdown() {
  await worker.close()
  await connection.quit()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
