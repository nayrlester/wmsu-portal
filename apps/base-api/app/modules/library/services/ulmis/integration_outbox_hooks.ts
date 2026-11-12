import { DateTime } from 'luxon'
import type Fine from '#modules/library/models/fine'
import Member from '#modules/library/models/member'
import UlmisOutboxService from '#modules/library/services/ulmis/ulmis_outbox_service'
import { balanceCents } from '#modules/library/services/fines/fine_calculator'

const outbox = new UlmisOutboxService()

export async function enqueueClearanceRefresh(memberId: string) {
  const member = await Member.query().where('id', memberId).first()
  const card = member?.libraryCardNumber?.trim()
  if (!card) return

  await outbox.enqueue({
    contractCode: 'INT-LIB-04',
    targetSystem: 'Platform CIS clearance',
    eventType: 'library.deficiency.refresh',
    idempotencyKey: `INT-LIB-04:${memberId}:${DateTime.now().toFormat('yyyy-MM-dd')}`,
    payload: {
      memberId,
      libraryCardNumber: card,
      source: 'ulmis',
    },
  })
}

export async function enqueueFineReferral(fine: Fine) {
  const balance = balanceCents(fine.amountCents, fine.paidCents, fine.waivedCents)
  if (balance <= 0) return

  await outbox.enqueue({
    contractCode: 'INT-LIB-05',
    targetSystem: 'UFMS cashiering',
    eventType: 'library.fine.referral',
    idempotencyKey: `INT-LIB-05:${fine.id}:balance`,
    payload: {
      fineId: fine.id,
      memberId: fine.memberId,
      amountCents: balance,
      reason: fine.reason,
    },
  })
}

export async function enqueueFinePaymentReconcile(fine: Fine, paymentReference?: string | null) {
  await outbox.enqueue({
    contractCode: 'INT-LIB-06',
    targetSystem: 'UFMS cashiering',
    eventType: 'library.fine.payment.reconcile',
    idempotencyKey: `INT-LIB-06:${fine.id}:paid-${fine.paidCents}`,
    payload: {
      fineId: fine.id,
      memberId: fine.memberId,
      paidCents: fine.paidCents,
      status: fine.status,
      reference: paymentReference ?? null,
    },
  })
}

export function scheduleIntegrationSideEffects(fine: Fine, paymentReference?: string | null) {
  void enqueueClearanceRefresh(fine.memberId).catch(() => {})
  void enqueueFineReferral(fine).catch(() => {})
  if (fine.paidCents > 0) {
    void enqueueFinePaymentReconcile(fine, paymentReference).catch(() => {})
  }
}
