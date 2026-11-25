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

/** Advising is required only for 1st year / 1st semester and transferees. */
export function isAcademicAdvisingRequired(input: {
  yearLevel: number | null | undefined
  semester: number | null | undefined
  classification?: string | null
}): boolean {
  const classification = (input.classification ?? '').trim().toLowerCase()
  if (classification === 'transferee') return true
  const yearLevel = Number(input.yearLevel ?? 0)
  const semester = Number(input.semester ?? 0)
  return yearLevel === 1 && semester === 1
}

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
