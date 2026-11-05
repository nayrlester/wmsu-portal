export type UsisReportId =
  | 'admissions'
  | 'applicant-statistics'
  | 'student-population'
  | 'enrollment-statistics'
  | 'enrollment-by-campus'
  | 'enrollment-by-college'
  | 'enrollment-by-program'
  | 'enrollment-by-year-level'
  | 'subject-demand'
  | 'class-utilization'
  | 'advising-completion'
  | 'student-deficiencies'
  | 'grade-submission-monitoring'
  | 'academic-performance'
  | 'scholarship-records'
  | 'student-support-statistics'
  | 'queue-management-statistics'
  | 'hemis-enrollment-extract'
  | 'hemis-student-demographics'

export type UsisDashboardRole =
  | 'registrar'
  | 'academic_affairs'
  | 'admissions'
  | 'osa'
  | 'guidance'
  | 'health'
  | 'scholarship'
  | 'executive'

export type ReportFilterInput = {
  academicYearId?: string
  semester?: number
  campusId?: string
  collegeCode?: string
  programId?: string
  yearLevel?: number
  dateFrom?: string
  dateTo?: string
}

export type ReportDefinition = {
  id: UsisReportId
  title: string
  description: string
  torIds: string[]
  requiredAnyOf: string[]
  confidential: boolean
  supportsExport: Array<'csv' | 'xlsx' | 'pdf'>
  calculation: string
}

export const USIS_REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'admissions',
    title: 'Admissions',
    description: 'Applicant pipeline counts by status for the selected period.',
    torIds: ['ENR-033', 'ENR-037', 'ENR-052'],
    requiredAnyOf: ['applicants.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'Count applicants in organization scoped by applied_at date range (optional). Status buckets are raw applicant.status values. Total equals COUNT(*) on the filtered applicant set.',
  },
  {
    id: 'applicant-statistics',
    title: 'Applicant statistics',
    description: 'Admitted vs pending vs rejected with program breakdown.',
    torIds: ['ENR-033', 'ENR-037'],
    requiredAnyOf: ['applicants.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'Group applicants by status and program_id. Totals are SUM of group counts and must equal filtered applicant COUNT(*).',
  },
  {
    id: 'student-population',
    title: 'Student population',
    description: 'Active student headcount by status, campus, and program.',
    torIds: ['ENR-033', 'ENR-036', 'ENR-052'],
    requiredAnyOf: ['students.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'COUNT students filtered by organization, optional campus (mdm_campus_id), college code prefix on program.code, and programId. Status distribution uses student.status.',
  },
  {
    id: 'enrollment-statistics',
    title: 'Enrollment statistics',
    description: 'Enrollment headcount by workflow status for a term.',
    torIds: ['ENR-033', 'ENR-052'],
    requiredAnyOf: ['enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'COUNT enrollments filtered by academic_year_id, semester, campus, college prefix, program, year_level, and created_at range. Group by enrollment.status. Grand total = filtered COUNT(*).',
  },
  {
    id: 'enrollment-by-campus',
    title: 'Enrollment by campus',
    description: 'Registered/active enrollments distributed by student campus.',
    torIds: ['ENR-033'],
    requiredAnyOf: ['enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'Join enrollments→students; group by COALESCE(students.mdm_campus_id, UNASSIGNED). Sum of campus counts equals filtered enrollment total.',
  },
  {
    id: 'enrollment-by-college',
    title: 'Enrollment by college',
    description: 'Enrollment distribution by college code derived from program.code prefix.',
    torIds: ['ENR-033'],
    requiredAnyOf: ['enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'College key = upper(split_part(program.code, \'-\', 1)) when program exists, else UNASSIGNED. Optional collegeCode filter matches that key. Totals reconcile to filtered enrollments.',
  },
  {
    id: 'enrollment-by-program',
    title: 'Enrollment by program',
    description: 'Enrollment counts per academic program.',
    torIds: ['ENR-033'],
    requiredAnyOf: ['enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation: 'Group filtered enrollments by student.program_id / program.code.',
  },
  {
    id: 'enrollment-by-year-level',
    title: 'Enrollment by year level',
    description: 'Enrollment counts per year level.',
    torIds: ['ENR-033'],
    requiredAnyOf: ['enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation: 'Group filtered enrollments by enrollments.year_level.',
  },
  {
    id: 'subject-demand',
    title: 'Subject demand',
    description: 'Demand from enrollment lines and advising recommendations.',
    torIds: ['ENR-017B', 'ENR-033', 'ENR-052'],
    requiredAnyOf: ['enrollments.read', 'advising.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'COUNT enrollment_lines (joined to filtered enrollments) grouped by subject_code. Advising demand COUNT advising_recommendations for sessions linked to those enrollments.',
  },
  {
    id: 'class-utilization',
    title: 'Class utilization',
    description: 'Section capacity vs enrolled_count utilization rate.',
    torIds: ['ENR-039', 'ENR-052'],
    requiredAnyOf: ['academic.read', 'enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'For sections in term: utilization = enrolled_count / NULLIF(capacity,0). Rows include capacity, enrolled_count, utilizationPct.',
  },
  {
    id: 'advising-completion',
    title: 'Advising completion',
    description: 'Advised vs not advised headcount and completion rate.',
    torIds: ['ENR-017B', 'ENR-033'],
    requiredAnyOf: ['advising.read', 'enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'Advised = enrollment status in (advised, assessed, payment_verified, registered) OR advising_waived. completionRate = advised / total.',
  },
  {
    id: 'student-deficiencies',
    title: 'Student deficiencies',
    description: 'Open and cleared deficiency counts by requirement code.',
    torIds: ['ENR-014', 'ENR-033'],
    requiredAnyOf: ['deficiencies.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation: 'Group student_deficiencies by requirement_code and status within organization scope.',
  },
  {
    id: 'grade-submission-monitoring',
    title: 'Grade submission monitoring',
    description: 'Class record submission/lock status for the term.',
    torIds: ['ENR-021', 'ENR-049', 'ENR-052'],
    requiredAnyOf: ['grades.read', 'grades.admin', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation: 'Group class_records by status for academic_year_id + semester filters. Total = COUNT class_records.',
  },
  {
    id: 'academic-performance',
    title: 'Academic performance',
    description: 'GWA snapshot aggregates and standing distribution (no individual clinical data).',
    torIds: ['ENR-023', 'ENR-040', 'ENR-052'],
    requiredAnyOf: ['grades.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'Aggregate gwa_snapshots: AVG(term_gwa), AVG(cumulative_gwa), COUNT by academic_standing. Optional academicYearId/semester filters.',
  },
  {
    id: 'scholarship-records',
    title: 'Scholarship records',
    description: 'Award counts and amounts by scholarship code/status.',
    torIds: ['ENR-059', 'ENR-052'],
    requiredAnyOf: ['scholarships.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation: 'Group scholarships by scholarship_code and status; SUM(amount). Totals reconcile to COUNT(*) and SUM(amount).',
  },
  {
    id: 'student-support-statistics',
    title: 'Student support service statistics',
    description: 'Aggregate office service volumes only — no case notes or clinical content.',
    torIds: ['ENR-052', 'ENR-053', 'ENR-058', 'ENR-060'],
    requiredAnyOf: ['guidance.read', 'health.read', 'osa.read', 'scholarships.read', 'sss.admin', 'reports.read'],
    confidential: true,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'COUNT sss_service_requests by office and status. Guidance/health rows never include note text. Callers without office permission omit that office bucket.',
  },
  {
    id: 'queue-management-statistics',
    title: 'Queue management statistics',
    description: 'Queue ticket volumes and waiting counts by office.',
    torIds: ['ENR-064', 'ENR-052'],
    requiredAnyOf: ['guidance.read', 'health.read', 'osa.read', 'sss.admin', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation: 'COUNT sss_queue_tickets by office and status within optional date range on created_at.',
  },
  {
    id: 'hemis-enrollment-extract',
    title: 'HEMIS enrollment extract',
    description:
      'CHED-regulator dataset: one row per enrollment with HEMIS-shaped columns (schema version in export metadata).',
    torIds: ['ENR-034'],
    requiredAnyOf: ['enrollments.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'Join enrollments→students→programs→academic_years; map to HEMIS_ENROLLMENT_COLUMNS. Row count must equal filtered DISTINCT enrollment count (capped at 5000 rows per run).',
  },
  {
    id: 'hemis-student-demographics',
    title: 'HEMIS student demographics',
    description: 'Student master extract with HEMIS-shaped demographic and program fields.',
    torIds: ['ENR-034'],
    requiredAnyOf: ['students.read', 'reports.read'],
    confidential: false,
    supportsExport: ['csv', 'xlsx', 'pdf'],
    calculation:
      'One row per student in organization scope with filters; map to HEMIS_STUDENT_COLUMNS. Totals reconcile to filtered student COUNT(*).',
  },
]

export const DASHBOARD_REPORTS: Record<UsisDashboardRole, UsisReportId[]> = {
  registrar: [
    'admissions',
    'applicant-statistics',
    'student-population',
    'enrollment-statistics',
    'enrollment-by-campus',
    'enrollment-by-college',
    'enrollment-by-program',
    'enrollment-by-year-level',
    'subject-demand',
    'class-utilization',
    'advising-completion',
    'student-deficiencies',
    'grade-submission-monitoring',
    'academic-performance',
    'hemis-enrollment-extract',
    'hemis-student-demographics',
  ],
  academic_affairs: [
    'enrollment-statistics',
    'enrollment-by-campus',
    'enrollment-by-college',
    'enrollment-by-program',
    'enrollment-by-year-level',
    'subject-demand',
    'class-utilization',
    'advising-completion',
    'grade-submission-monitoring',
    'academic-performance',
    'hemis-enrollment-extract',
    'hemis-student-demographics',
  ],
  admissions: ['admissions', 'applicant-statistics', 'student-population'],
  osa: ['student-support-statistics', 'queue-management-statistics'],
  guidance: ['student-support-statistics', 'queue-management-statistics', 'advising-completion'],
  health: ['student-support-statistics', 'queue-management-statistics'],
  scholarship: ['scholarship-records', 'student-support-statistics'],
  executive: [
    'admissions',
    'student-population',
    'enrollment-statistics',
    'enrollment-by-campus',
    'enrollment-by-college',
    'enrollment-by-program',
    'enrollment-by-year-level',
    'advising-completion',
    'grade-submission-monitoring',
    'academic-performance',
    'scholarship-records',
    'student-support-statistics',
    'queue-management-statistics',
    'hemis-enrollment-extract',
    'hemis-student-demographics',
  ],
}

export function resolveDashboardRole(permissions: string[]): UsisDashboardRole {
  if (permissions.includes('enrollments.write') || permissions.includes('academic.write')) {
    return permissions.includes('applicants.write') && !permissions.includes('grades.admin')
      ? 'registrar'
      : 'registrar'
  }
  if (permissions.includes('applicants.write') && !permissions.includes('enrollments.write')) return 'admissions'
  if (permissions.includes('guidance.read') || permissions.includes('guidance.write')) return 'guidance'
  if (permissions.includes('health.read') || permissions.includes('health.write')) return 'health'
  if (permissions.includes('osa.read') || permissions.includes('osa.write')) return 'osa'
  if (permissions.includes('scholarships.write') || permissions.includes('scholarships.read')) {
    return 'scholarship'
  }
  if (permissions.includes('grades.read') && permissions.includes('enrollments.read')) return 'academic_affairs'
  if (permissions.includes('reports.read')) return 'executive'
  return 'registrar'
}

export function canAccessReport(permissions: string[], report: ReportDefinition): boolean {
  if (permissions.includes('*') || permissions.includes('admin')) return true
  if (permissions.includes('reports.read') && !report.confidential) return true
  if (permissions.includes('sss.admin') && report.confidential) return true
  return report.requiredAnyOf.some((code) => permissions.includes(code))
}
