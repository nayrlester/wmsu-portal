import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import Borrowing from '#modules/library/models/borrowing'
import { DateTime } from 'luxon'

export function borrowingTenantId(): string {
  return tenantContext.get().id
}

export async function generateTransactionNumber(tenantId: string): Promise<string> {
  const year = DateTime.now().year
  const prefix = `BRW-${year}-`

  const latest = await Borrowing.query()
    .where('tenant_id', tenantId)
    .whereILike('transaction_number', `${prefix}%`)
    .orderBy('transaction_number', 'desc')
    .first()

  let sequence = 1
  if (latest) {
    const parts = latest.transactionNumber.split('-')
    const lastSeq = Number.parseInt(parts[parts.length - 1] ?? '0', 10)
    if (!Number.isNaN(lastSeq)) sequence = lastSeq + 1
  }

  return `${prefix}${String(sequence).padStart(6, '0')}`
}
