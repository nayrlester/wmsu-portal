import { createHash, randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'

export async function findIdempotentResponse(scope: string, key: string) {
  return db.from('cis_idempotency_keys').where({ scope, idempotency_key: key }).first()
}

export async function storeIdempotentResponse(input: {
  scope: string
  key: string
  requestHash?: string | null
  responseStatus: number
  responseBody: unknown
  ttlHours?: number
}) {
  const expiresAt =
    input.ttlHours != null ? new Date(Date.now() + input.ttlHours * 3600_000) : new Date(Date.now() + 24 * 3600_000)

  await db.table('cis_idempotency_keys').insert({
    id: randomUUID(),
    scope: input.scope,
    idempotency_key: input.key,
    request_hash: input.requestHash ?? null,
    response_status: input.responseStatus,
    response_body: input.responseBody,
    expires_at: expiresAt,
    created_at: new Date(),
  })
}

export function hashPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex')
}
