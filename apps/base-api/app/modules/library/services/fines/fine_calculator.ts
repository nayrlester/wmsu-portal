import { DateTime } from 'luxon'
import {
  BORROWING_DEFAULTS,
  type CirculationLoanRules,
} from '#modules/library/services/borrowing/borrowing_settings'

export function calculateOverdueFineCents(
  dueAt: DateTime,
  returnedAt: DateTime = DateTime.now(),
  rules: Pick<CirculationLoanRules, 'finePerDayCents' | 'maxFineCents'> = BORROWING_DEFAULTS
): number {
  if (returnedAt <= dueAt) return 0

  const daysOverdue = Math.ceil(returnedAt.diff(dueAt, 'days').days)
  const raw = daysOverdue * rules.finePerDayCents
  return Math.min(raw, rules.maxFineCents)
}

export function calculateLostPenaltyCents(
  rules: Pick<CirculationLoanRules, 'lostBookPenaltyCents'> = BORROWING_DEFAULTS
): number {
  return rules.lostBookPenaltyCents
}

export function computeFineStatus(
  amountCents: number,
  paidCents: number,
  waivedCents: number
): 'pending' | 'partial' | 'paid' | 'waived' {
  const settled = paidCents + waivedCents
  if (settled >= amountCents) {
    return waivedCents >= amountCents ? 'waived' : 'paid'
  }
  if (paidCents > 0) return 'partial'
  return 'pending'
}

export function balanceCents(amountCents: number, paidCents: number, waivedCents: number): number {
  return Math.max(0, amountCents - paidCents - waivedCents)
}
