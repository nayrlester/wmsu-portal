export type GradeMarkDefinition = {
  code: string
  label: string
  numericEquivalent: number | null
  remark: string
  isIncomplete?: boolean
  isDropped?: boolean
  isNoGrade?: boolean
  countsInGwa?: boolean
  isPassing?: boolean
}

export const DEFAULT_GRADING_MARKS: GradeMarkDefinition[] = [
  { code: '1.00', label: 'Excellent', numericEquivalent: 1, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '1.25', label: 'Very Good', numericEquivalent: 1.25, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '1.50', label: 'Very Good', numericEquivalent: 1.5, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '1.75', label: 'Good', numericEquivalent: 1.75, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '2.00', label: 'Good', numericEquivalent: 2, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '2.25', label: 'Satisfactory', numericEquivalent: 2.25, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '2.50', label: 'Satisfactory', numericEquivalent: 2.5, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '2.75', label: 'Fair', numericEquivalent: 2.75, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '3.00', label: 'Passed', numericEquivalent: 3, remark: 'Passed', countsInGwa: true, isPassing: true },
  { code: '5.00', label: 'Failed', numericEquivalent: 5, remark: 'Failed', countsInGwa: true, isPassing: false },
  {
    code: 'INC',
    label: 'Incomplete',
    numericEquivalent: null,
    remark: 'Incomplete',
    isIncomplete: true,
    countsInGwa: false,
  },
  {
    code: 'DRP',
    label: 'Dropped',
    numericEquivalent: null,
    remark: 'Dropped',
    isDropped: true,
    countsInGwa: false,
  },
  {
    code: 'NG',
    label: 'No Grade',
    numericEquivalent: null,
    remark: 'No Grade',
    isNoGrade: true,
    countsInGwa: false,
  },
]

export const GRADE_CORRECTION_REASON_CODES = [
  'encoding_error',
  'computation_error',
  'identity_mismatch',
  'late_completion_of_inc',
  'registrar_directive',
  'other',
] as const

export type GradeCorrectionReasonCode = (typeof GRADE_CORRECTION_REASON_CODES)[number]

export const GRADE_ENTRY_STATUSES = ['draft', 'submitted', 'locked'] as const
export type GradeEntryStatus = (typeof GRADE_ENTRY_STATUSES)[number]

export const CLASS_RECORD_STATUSES = ['open', 'submitted', 'locked'] as const
export type ClassRecordStatus = (typeof CLASS_RECORD_STATUSES)[number]

export const CORRECTION_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const
