import UlmisIntegrationOutbox from '#modules/library/models/ulmis_integration_outbox'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'

export default class UlmisOutboxService {
  async list(filters?: { status?: string; contractCode?: string; page?: number; limit?: number }) {
    const tenantId = tenantContext.get().id
    const page = filters?.page ?? 1
    const limit = Math.min(filters?.limit ?? 25, 100)
    const q = UlmisIntegrationOutbox.query()
      .where('tenant_id', tenantId)
      .orderBy('created_at', 'desc')
    if (filters?.status) q.where('status', filters.status)
    if (filters?.contractCode) q.where('contract_code', filters.contractCode)
    return q.paginate(page, limit)
  }

  async enqueue(input: {
    contractCode: string
    targetSystem: string
    eventType: string
    idempotencyKey: string
    payload: Record<string, unknown>
  }) {
    const tenantId = tenantContext.get().id
    const existing = await UlmisIntegrationOutbox.query()
      .where('tenant_id', tenantId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (existing) return existing

    return UlmisIntegrationOutbox.create({
      tenantId,
      contractCode: input.contractCode,
      targetSystem: input.targetSystem,
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      status: 'pending',
      lastError: null,
      attemptCount: 0,
      processedAt: null,
    })
  }
}
