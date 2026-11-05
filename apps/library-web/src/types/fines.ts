export type FineStatus = 'pending' | 'partial' | 'paid' | 'waived'
export type FineReason = 'overdue' | 'lost' | 'manual'

export interface Fine {
  id: string
  memberId: string
  memberName?: string
  borrowingId: string | null
  bookTitle?: string | null
  reason: FineReason | string
  amountCents: number
  paidCents: number
  waivedCents: number
  balanceCents: number
  status: FineStatus
  assessedAt: string
  dueAt: string | null
  waivedAt: string | null
  waiveReason: string | null
  notes: string | null
  createdAt: string
}

export interface FineSummary {
  totalOutstandingCents: number
  pendingCount: number
  partialCount: number
  totalFines: number
}

export interface FineListParams {
  memberId?: string
  status?: FineStatus
  page?: number
  perPage?: number
}

export interface CreateManualFinePayload {
  memberId: string
  amountCents: number
  notes?: string
}

export interface WaiveFinePayload {
  amountCents?: number
  reason: string
}

export interface CollectFinePayload {
  amountCents: number
  paymentMethod?: string
  reference?: string
}

/** Philippine Peso — amounts are stored in centavos (cents). */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100)
}

export const FINE_STATUS_LABELS: Record<FineStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  waived: 'Waived',
}

export const FINE_REASON_LABELS: Record<string, string> = {
  overdue: 'Late return',
  lost: 'Lost book',
  manual: 'Manual',
}
