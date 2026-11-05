export class EnrollmentWorkflowError extends Error {
  constructor(
    message: string,
    readonly status: number = 422,
    readonly code: string = 'ENROLLMENT_WORKFLOW_ERROR',
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'EnrollmentWorkflowError'
  }
}

export const STUDENT_CLASSIFICATIONS = [
  'new',
  'freshman',
  'continuing',
  'returning',
  'transferee',
  'shiftee',
  'irregular',
  'cross_enrollee',
  'inter_college',
  'inter_department',
  'graduating',
  'foreigner',
] as const

export type StudentClassification = (typeof STUDENT_CLASSIFICATIONS)[number]

export const ENROLLMENT_STATUSES = [
  'draft',
  'advising',
  'advised',
  'assessed',
  'payment_verified',
  'registered',
  'rejected',
  'incomplete',
  'requires_readvising',
] as const

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const OVERRIDE_TYPES = [
  'prerequisite',
  'corequisite',
  'unit_load',
  'section_capacity',
  'deficiency',
  'financial_hold',
  'clearance',
] as const

export type OverrideType = (typeof OVERRIDE_TYPES)[number]
