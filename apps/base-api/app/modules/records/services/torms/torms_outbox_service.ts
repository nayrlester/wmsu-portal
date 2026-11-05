import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'

export class TormsOutboxService {
  async list(
    organizationId: string,
    filters: { status?: string; contractCode?: string; page?: number; perPage?: number } = {}
  ) {
    const page = Math.max(1, filters.page ?? 1)
    const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20))
    const q = db.from(t('torms_integration_outbox')).where('organization_id', organizationId)
    if (filters.status) q.andWhere('status', filters.status)
    if (filters.contractCode) q.andWhere('contract_code', filters.contractCode)

    const countRow = await q.clone().count<{ count: string }>('* as count').first()
    const total = Number(countRow?.count ?? 0)
    const rows = await q
      .clone()
      .orderBy('created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage)

    return {
      data: rows,
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  }

  async enqueue(input: {
    organizationId: string
    contractCode: string
    targetSystem: string
    eventType: string
    idempotencyKey: string
    payload: Record<string, unknown>
  }) {
    const existing = await db
      .from(t('torms_integration_outbox'))
      .where({
        organization_id: input.organizationId,
        idempotency_key: input.idempotencyKey,
      })
      .first()
    if (existing) return existing

    const now = new Date()
    const [row] = await db
      .table(t('torms_integration_outbox'))
      .insert({
        organization_id: input.organizationId,
        contract_code: input.contractCode,
        target_system: input.targetSystem,
        event_type: input.eventType,
        idempotency_key: input.idempotencyKey,
        status: 'pending',
        payload: input.payload,
        attempt_count: 0,
        created_at: now,
        updated_at: now,
      })
      .returning('*')
    return row
  }
}

export const tormsOutboxService = new TormsOutboxService()
