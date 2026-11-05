import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CirculationEvent from '#modules/library/models/circulation_event'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'

export type CirculationEventInput = {
  eventType: string
  borrowingId?: string | null
  bookId?: string | null
  copyId?: string | null
  memberId?: string | null
  channel?: string
  actorUserId?: string | null
  payload?: Record<string, unknown>
}

export default class CirculationEventService {
  async record(input: CirculationEventInput, trx?: TransactionClientContract) {
    return CirculationEvent.create(
      {
        tenantId: borrowingTenantId(),
        borrowingId: input.borrowingId ?? null,
        bookId: input.bookId ?? null,
        copyId: input.copyId ?? null,
        memberId: input.memberId ?? null,
        eventType: input.eventType,
        channel: input.channel ?? 'desk',
        actorUserId: input.actorUserId ?? null,
        payload: input.payload ?? {},
        createdAt: DateTime.now(),
      },
      trx ? { client: trx } : undefined
    )
  }

  async listForBorrowing(borrowingId: string) {
    return CirculationEvent.query()
      .where('tenant_id', borrowingTenantId())
      .where('borrowing_id', borrowingId)
      .orderBy('created_at', 'asc')
  }
}
