export const SSS_OFFICES = ['guidance', 'health', 'osa', 'scholarship'] as const
export type SssOffice = (typeof SSS_OFFICES)[number]

export const SA_WORKFLOW_STATUSES = [
  'submitted',
  'cjpc',
  'screening_committee',
  'vpsas',
  'president',
  'deployed',
  'rejected',
] as const

export const ORG_ACCREDITATION_STATUSES = ['osa', 'vpsas', 'legal', 'president', 'accredited', 'rejected'] as const

export const DISCIPLINE_WORKFLOW_STATUSES = [
  'intake',
  'investigation',
  'committee',
  'sdt',
  'decision',
  'closed',
] as const

/**
 * University decisions that must be confirmed before production (not invented here).
 * See docs/01-requirements/USIS_STUDENT_SUPPORT_SERVICES.md
 */
export const SSS_PENDING_UNIVERSITY_CONFIRMATIONS = [
  'ENR-058 health program mandatory set (drug/HIV/dental/medical) and enrollment gate policy',
  'ENR-058 medical assessment rules for freshmen vs transferees',
  'ENR-059 scholarship eligibility thresholds (GWA, income bands, program criteria)',
  'ENR-059 discount/coverage parameters and UniFAST posting rules with UFMS',
  'ENR-059 SA interview scoring and deployment eligibility rules',
  'ENR-060 SDT sanction catalog and appeal windows',
  'ENR-061 organization requirement checklists per application type',
  'ENR-062 RFID vendor integration contract and ID fee payment validation path',
  'ENR-054 psychological test battery catalog and release consultation rules',
  'ENR-055 counseling retention period and who may access case notes',
  'ENR-057 clinical note retention period under Data Privacy Act / university DPO',
  'ENR-063 which clearance offices block enrollment vs advisory-only',
] as const
