export const SSS_OFFICES = ['guidance', 'health', 'osa', 'scholarship'] as const
export type SssOffice = (typeof SSS_OFFICES)[number]

export const QUEUE_OFFICES = ['guidance', 'health', 'osa', 'registrar'] as const
export type QueueOffice = (typeof QUEUE_OFFICES)[number]

export const QUEUE_TICKET_STATUSES = ['waiting', 'called', 'completed', 'skipped', 'cancelled'] as const

export const QUEUE_TICKET_TRANSITIONS: Record<string, string[]> = {
  waiting: ['called', 'skipped', 'cancelled'],
  called: ['completed', 'skipped', 'waiting'],
}

export const COUNSELING_REQUEST_STATUSES = [
  'submitted',
  'intake',
  'assigned',
  'in_session',
  'follow_up',
  'referred',
  'resolved',
] as const

export const COUNSELING_REQUEST_TRANSITIONS: Record<string, string[]> = {
  submitted: ['intake', 'assigned', 'resolved'],
  intake: ['assigned', 'referred', 'resolved'],
  assigned: ['in_session', 'referred', 'resolved'],
  in_session: ['follow_up', 'referred', 'resolved'],
  follow_up: ['in_session', 'referred', 'resolved'],
  referred: ['follow_up', 'in_session', 'resolved'],
}

export const COUNSELING_SPECIALIST_TYPES = [
  { code: 'psychologist', label: 'Psychologist (scaffold)' },
  { code: 'medical_doctor', label: 'Medical doctor (scaffold)' },
  { code: 'psychiatrist', label: 'Psychiatrist (scaffold)' },
  { code: 'social_worker', label: 'Social worker (scaffold)' },
] as const

export const COUNSELING_SPECIALIST_CODES = COUNSELING_SPECIALIST_TYPES.map((s) => s.code)

export const COUNSELING_NOTE_KINDS = ['intake', 'session', 'follow_up', 'case_note', 'referral'] as const

export const SA_WORKFLOW_STATUSES = [
  'submitted',
  'cjpc',
  'screening_committee',
  'vpsas',
  'president',
  'deployed',
  'rejected',
] as const

export const SA_WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  submitted: ['cjpc', 'rejected'],
  cjpc: ['screening_committee', 'rejected'],
  screening_committee: ['vpsas', 'rejected'],
  vpsas: ['president', 'rejected'],
  president: ['deployed', 'rejected'],
}

export const SA_REQUIREMENT_KEYS_DEFAULT = [
  'application_form',
  'grades_certification',
  'interview_availability',
  'office_preference',
] as const

export const ORG_ACCREDITATION_STATUSES = ['osa', 'vpsas', 'legal', 'president', 'accredited', 'rejected'] as const

export const ORG_ACCREDITATION_TRANSITIONS: Record<string, string[]> = {
  osa: ['vpsas', 'rejected'],
  vpsas: ['legal', 'rejected'],
  legal: ['president', 'rejected'],
  president: ['accredited', 'rejected'],
}

export const ORG_REQUIREMENT_KEYS_DEFAULT = [
  'constitution_bylaws',
  'list_of_officers',
  'membership_roster',
  'adviser_endorsement',
] as const

export const STUDENT_ID_REQUEST_TYPES = ['new', 'replacement'] as const

export const STUDENT_ID_REQUEST_STATUSES = [
  'submitted',
  'osa_verified',
  'payment_pending',
  'payment_validated',
  'digital_issued',
  'print_queued',
  'printed',
  'rejected',
] as const

export const STUDENT_ID_REQUEST_TRANSITIONS: Record<string, string[]> = {
  submitted: ['osa_verified', 'rejected'],
  osa_verified: ['payment_pending', 'digital_issued', 'rejected'],
  payment_pending: ['payment_validated', 'rejected'],
  payment_validated: ['digital_issued', 'print_queued', 'rejected'],
  digital_issued: ['print_queued', 'printed', 'rejected'],
  print_queued: ['printed', 'rejected'],
}

export const DISCIPLINE_WORKFLOW_STATUSES = [
  'intake',
  'investigation',
  'committee',
  'sdt',
  'decision',
  'closed',
] as const

export const DISCIPLINE_WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  intake: ['investigation', 'closed'],
  investigation: ['committee', 'closed'],
  committee: ['sdt', 'decision', 'closed'],
  sdt: ['decision', 'closed'],
  decision: ['closed'],
}

export const DISCIPLINE_SANCTION_CATALOG = [
  { code: 'WARNING', label: 'Written warning (scaffold)' },
  { code: 'REPRIMAND', label: 'Reprimand (scaffold)' },
  { code: 'PROBATION', label: 'Disciplinary probation (scaffold)' },
  { code: 'SUSPENSION', label: 'Suspension (scaffold)' },
  { code: 'EXPULSION', label: 'Expulsion (scaffold)' },
  { code: 'COMMUNITY_SERVICE', label: 'Community service (scaffold)' },
] as const

export const DISCIPLINE_SANCTION_CODES = DISCIPLINE_SANCTION_CATALOG.map((s) => s.code)

export const PSYCH_TEST_BATTERY_CATALOG = [
  { code: 'ENTRANCE_PSYCH', label: 'Entrance psychological screening', scoringMode: 'staff_encoded' },
  { code: 'SHIFTING_PSYCH', label: 'Shifting / program change battery', scoringMode: 'staff_encoded' },
  { code: 'COUNSELING_INTAKE', label: 'Counseling intake psychometrics', scoringMode: 'staff_encoded' },
] as const

export const PSYCH_TEST_CODES = PSYCH_TEST_BATTERY_CATALOG.map((b) => b.code)

export const PSYCH_SCHEDULE_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

export const SHIFTING_EXAM_STATUSES = [
  'submitted',
  'requirements_incomplete',
  'requirements_validated',
  'scheduled',
  'payment_tagged',
  'result_ready',
  'released',
  'endorsed',
  'rejected',
] as const

export const SHIFTING_EXAM_TRANSITIONS: Record<string, string[]> = {
  submitted: ['requirements_incomplete', 'requirements_validated', 'rejected'],
  requirements_incomplete: ['requirements_validated', 'rejected'],
  requirements_validated: ['scheduled', 'rejected'],
  scheduled: ['payment_tagged', 'rejected'],
  payment_tagged: ['result_ready', 'rejected'],
  result_ready: ['released', 'rejected'],
  released: ['endorsed', 'rejected'],
}

export const SHIFTING_REQUIREMENT_KEYS_DEFAULT = [
  'application_form',
  'current_grades',
  'dean_endorsement_letter',
  'parent_consent',
] as const

export const SHIFTING_ENDORSEMENT_PARTIES = ['originating_college', 'receiving_college', 'admission'] as const

export const HEALTH_PROGRAM_CATALOG = [
  { code: 'DRUG_TESTING', label: 'Drug testing', mandatoryDefault: true },
  { code: 'HIV_SCREENING', label: 'HIV screening', mandatoryDefault: true },
  { code: 'DENTAL_EXAM', label: 'Dental examination', mandatoryDefault: true },
  { code: 'MEDICAL_EXAM', label: 'Medical examination', mandatoryDefault: true },
] as const

export const HEALTH_PROGRAM_CODES = HEALTH_PROGRAM_CATALOG.map((p) => p.code)

export const HEALTH_PROGRAM_STATUSES = ['scheduled', 'completed', 'missed', 'excused'] as const

export const MEDICAL_ASSESSMENT_CONTEXTS = ['freshman', 'transferee', 'returning', 'other'] as const

/**
 * University decisions that must be confirmed before production (not invented here).
 * See docs/01-requirements/USIS_STUDENT_SUPPORT_SERVICES.md
 */
export const SSS_PENDING_UNIVERSITY_CONFIRMATIONS = [
  'ENR-058 health program mandatory set (drug/HIV/dental/medical) and enrollment gate policy (scaffold mandatory flags only)',
  'ENR-058 medical assessment rules for freshmen vs transferees',
  'ENR-059 scholarship eligibility thresholds (GWA, income bands, program criteria)',
  'ENR-059 discount/coverage parameters and UniFAST posting rules with UFMS',
  'ENR-059 SA interview scoring and deployment eligibility rules',
  'ENR-060 SDT sanction catalog and appeal windows',
  'ENR-061 organization requirement checklists per application type',
  'ENR-062 RFID vendor integration contract and ID fee payment validation path',
  'ENR-054 psychological test battery catalog and release consultation rules (scaffold codes only)',
  'ENR-055 counseling retention period and who may access case notes',
  'ENR-057 clinical note retention period under Data Privacy Act / university DPO',
  'ENR-063 which clearance offices block enrollment vs advisory-only',
] as const
