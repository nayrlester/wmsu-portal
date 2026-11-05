export const HEMIS_SCHEMA_VERSION = '1.0.0-demo'

export const HEMIS_ENROLLMENT_COLUMNS = [
  'institution_code',
  'academic_year_code',
  'semester',
  'student_number',
  'last_name',
  'first_name',
  'middle_name',
  'birth_date',
  'program_code',
  'program_name',
  'year_level',
  'enrollment_status',
  'campus_ref',
  'student_status',
  'classification',
] as const

export const HEMIS_STUDENT_COLUMNS = [
  'institution_code',
  'student_number',
  'last_name',
  'first_name',
  'middle_name',
  'birth_date',
  'email',
  'mobile',
  'program_code',
  'program_name',
  'year_level',
  'student_status',
  'campus_ref',
  'classification',
] as const

export type HemisEnrollmentRow = Record<(typeof HEMIS_ENROLLMENT_COLUMNS)[number], string | number | null>
export type HemisStudentRow = Record<(typeof HEMIS_STUDENT_COLUMNS)[number], string | number | null>
