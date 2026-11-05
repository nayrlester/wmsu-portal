/**
 * Interim circulation rule defaults (LIB-005 / LIB-007 / LIB-030).
 *
 * TOR requires configurable rules by patron category; official WMSU tables are
 * For Clarification. Values below are seeded into `ulmis_system_settings`
 * under key `circulation.loan_rules` and may be changed by admins without code.
 * They must not be presented as certified WMSU policy.
 */
export const CIRCULATION_RULES_SETTING_KEY = 'circulation.loan_rules'

export const BORROWING_DEFAULTS = {
  loanPeriodDays: 14,
  renewalPeriodDays: 14,
  maxRenewals: 2,
  finePerDayCents: 25,
  maxFineCents: 1500,
  lostBookPenaltyCents: 5000,
  maxActiveBorrowings: 5,
  holdPickupDays: 3,
  policyNote:
    'Interim configurable defaults pending official WMSU patron-category loan tables (LIB-005 FC)',
} as const

export type CirculationLoanRules = {
  loanPeriodDays: number
  renewalPeriodDays: number
  maxRenewals: number
  finePerDayCents: number
  maxFineCents: number
  lostBookPenaltyCents: number
  maxActiveBorrowings: number
  holdPickupDays: number
  policyNote?: string
}

export function normalizeCirculationRules(
  raw: Record<string, unknown> | null | undefined
): CirculationLoanRules {
  const n = (key: keyof typeof BORROWING_DEFAULTS, min: number, max: number) => {
    const value = Number(raw?.[key])
    if (!Number.isFinite(value)) return BORROWING_DEFAULTS[key] as number
    return Math.min(max, Math.max(min, Math.trunc(value)))
  }

  return {
    loanPeriodDays: n('loanPeriodDays', 1, 365),
    renewalPeriodDays: n('renewalPeriodDays', 1, 365),
    maxRenewals: n('maxRenewals', 0, 20),
    finePerDayCents: n('finePerDayCents', 0, 100_000),
    maxFineCents: n('maxFineCents', 0, 10_000_000),
    lostBookPenaltyCents: n('lostBookPenaltyCents', 0, 10_000_000),
    maxActiveBorrowings: n('maxActiveBorrowings', 1, 100),
    holdPickupDays: n('holdPickupDays', 1, 30),
    policyNote:
      typeof raw?.policyNote === 'string' ? raw.policyNote : BORROWING_DEFAULTS.policyNote,
  }
}
