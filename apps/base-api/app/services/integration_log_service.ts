import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'

export async function logIntegrationTransaction(input: {
  correlationId?: string | null
  direction?: 'inbound' | 'outbound'
  sourceSystem: string
  targetSystem: string
  operation: string
  idempotencyKey?: string | null
  status: string
  httpStatus?: number | null
  requestPayload?: unknown
  responsePayload?: unknown
  errorMessage?: string | null
  attemptCount?: number
}) {
  const id = randomUUID()
  const now = new Date()
  await db.table('cis_integration_transactions').insert({
    id,
    correlation_id: input.correlationId ?? null,
    direction: input.direction ?? 'inbound',
    source_system: input.sourceSystem,
    target_system: input.targetSystem,
    operation: input.operation,
    idempotency_key: input.idempotencyKey ?? null,
    status: input.status,
    http_status: input.httpStatus ?? null,
    request_payload: input.requestPayload ?? null,
    response_payload: input.responsePayload ?? null,
    error_message: input.errorMessage ?? null,
    attempt_count: input.attemptCount ?? 1,
    created_at: now,
    updated_at: now,
  })
  return id
}

export async function updateIntegrationTransaction(
  id: string,
  patch: Partial<{
    status: string
    httpStatus: number
    responsePayload: unknown
    errorMessage: string | null
    attemptCount: number
  }>
) {
  await db
    .from('cis_integration_transactions')
    .where('id', id)
    .update({
      ...(patch.status != null ? { status: patch.status } : {}),
      ...(patch.httpStatus != null ? { http_status: patch.httpStatus } : {}),
      ...(patch.responsePayload !== undefined ? { response_payload: patch.responsePayload } : {}),
      ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
      ...(patch.attemptCount != null ? { attempt_count: patch.attemptCount } : {}),
      updated_at: new Date(),
    })
}
