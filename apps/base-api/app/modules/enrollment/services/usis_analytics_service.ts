import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import {
  USIS_REPORT_DEFINITIONS,
  DASHBOARD_REPORTS,
  canAccessReport,
  resolveDashboardRole,
  type ReportFilterInput,
  type UsisReportId,
} from '#modules/enrollment/domain/usis_reports'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'
import { rowsToCsv, rowsToExcelXml, rowsToSimplePdf } from '#modules/enrollment/services/report_export'
import { hemisRegulatoryService } from '#modules/enrollment/services/hemis_regulatory_service'

export type AnalyticsResult = {
  reportId: UsisReportId
  title: string
  filters: ReportFilterInput
  generatedAt: string
  columns: string[]
  rows: Record<string, unknown>[]
  totals: Record<string, number>
  validation: { ok: boolean; message: string; expectedTotal?: number; actualTotal?: number }
  confidential: boolean
  calculation: string
}

type Scope = {
  organizationId: string
  permissions: string[]
}

function collegeExpr(alias = 'p') {
  return `UPPER(COALESCE(NULLIF(SPLIT_PART(${alias}.code, '-', 1), ''), 'UNASSIGNED'))`
}

export class UsisAnalyticsService {
  catalog(permissions: string[]) {
    const role = resolveDashboardRole(permissions)
    const allowed = USIS_REPORT_DEFINITIONS.filter((d) => canAccessReport(permissions, d))
    return {
      role,
      dashboards: DASHBOARD_REPORTS[role].filter((id) => allowed.some((d) => d.id === id)),
      reports: allowed.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        torIds: d.torIds,
        confidential: d.confidential,
        supportsExport: d.supportsExport,
        calculation: d.calculation,
      })),
    }
  }

  async run(scope: Scope, reportId: UsisReportId, filters: ReportFilterInput): Promise<AnalyticsResult> {
    const def = USIS_REPORT_DEFINITIONS.find((d) => d.id === reportId)
    if (!def) throw Object.assign(new Error('Unknown report'), { status: 404 })
    if (!canAccessReport(scope.permissions, def)) {
      throw Object.assign(new Error('Forbidden for this report scope'), { status: 403 })
    }

    const builders: Record<UsisReportId, () => Promise<AnalyticsResult>> = {
      admissions: () => this.admissions(scope, filters, def),
      'applicant-statistics': () => this.applicantStatistics(scope, filters, def),
      'student-population': () => this.studentPopulation(scope, filters, def),
      'enrollment-statistics': () => this.enrollmentStatistics(scope, filters, def),
      'enrollment-by-campus': () => this.enrollmentByCampus(scope, filters, def),
      'enrollment-by-college': () => this.enrollmentByCollege(scope, filters, def),
      'enrollment-by-program': () => this.enrollmentByProgram(scope, filters, def),
      'enrollment-by-year-level': () => this.enrollmentByYearLevel(scope, filters, def),
      'subject-demand': () => this.subjectDemand(scope, filters, def),
      'class-utilization': () => this.classUtilization(scope, filters, def),
      'advising-completion': () => this.advisingCompletion(scope, filters, def),
      'student-deficiencies': () => this.studentDeficiencies(scope, filters, def),
      'grade-submission-monitoring': () => this.gradeSubmission(scope, filters, def),
      'academic-performance': () => this.academicPerformance(scope, filters, def),
      'scholarship-records': () => this.scholarshipRecords(scope, filters, def),
      'student-support-statistics': () => this.supportStatistics(scope, filters, def),
      'queue-management-statistics': () => this.queueStatistics(scope, filters, def),
      'hemis-enrollment-extract': () => this.hemisEnrollmentExtract(scope, filters, def),
      'hemis-student-demographics': () => this.hemisStudentDemographics(scope, filters, def),
    }

    return builders[reportId]()
  }

  async export(
    scope: Scope,
    reportId: UsisReportId,
    filters: ReportFilterInput,
    format: 'csv' | 'xlsx' | 'pdf' | 'json',
    actorUserId: string
  ) {
    const result = await this.run(scope, reportId, filters)
    await auditLogService.log({
      organizationId: scope.organizationId,
      actorUserId,
      action: AuditAction.REPORT_EXPORT,
      entityType: 'usis_report',
      entityId: null,
      metadata: { reportId, format, filters, confidential: result.confidential },
    })

    if (format === 'json') {
      const payload = {
        reportId: result.reportId,
        title: result.title,
        schemaVersion:
          reportId.startsWith('hemis-') && result.totals.schemaVersion
            ? String(result.totals.schemaVersion)
            : undefined,
        generatedAt: result.generatedAt,
        filters: result.filters,
        columns: result.columns,
        rows: result.rows,
        totals: result.totals,
        validation: result.validation,
      }
      return {
        contentType: 'application/json; charset=utf-8',
        filename: `${reportId}.json`,
        body: Buffer.from(JSON.stringify(payload, null, 2), 'utf8'),
      }
    }

    if (format === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${reportId}.csv`,
        body: rowsToCsv(result.rows),
      }
    }
    if (format === 'xlsx') {
      return {
        contentType: 'application/vnd.ms-excel',
        filename: `${reportId}.xls`,
        body: rowsToExcelXml(result.rows, result.title.slice(0, 31)),
      }
    }
    return {
      contentType: 'application/pdf',
      filename: `${reportId}.pdf`,
      body: rowsToSimplePdf(result.title, result.rows),
    }
  }

  private baseResult(
    def: (typeof USIS_REPORT_DEFINITIONS)[number],
    filters: ReportFilterInput,
    rows: Record<string, unknown>[],
    totals: Record<string, number>,
    validation: AnalyticsResult['validation']
  ): AnalyticsResult {
    return {
      reportId: def.id,
      title: def.title,
      filters,
      generatedAt: new Date().toISOString(),
      columns: rows[0] ? Object.keys(rows[0]) : [],
      rows,
      totals,
      validation,
      confidential: def.confidential,
      calculation: def.calculation,
    }
  }

  private enrollmentBase(organizationId: string, filters: ReportFilterInput) {
    let q = db
      .from(`${t('enrollments')} as e`)
      .join(`${t('students')} as s`, 's.id', 'e.student_id')
      .leftJoin(`${t('programs')} as p`, 'p.id', 's.program_id')
      .where('e.organization_id', organizationId)
    if (filters.academicYearId) q = q.where('e.academic_year_id', filters.academicYearId)
    if (filters.semester != null) q = q.where('e.semester', filters.semester)
    if (filters.campusId) q = q.where('s.mdm_campus_id', filters.campusId)
    if (filters.programId) q = q.where('s.program_id', filters.programId)
    if (filters.yearLevel != null) q = q.where('e.year_level', filters.yearLevel)
    if (filters.collegeCode) {
      q = q.whereRaw(`${collegeExpr('p')} = ?`, [filters.collegeCode.toUpperCase()])
    }
    if (filters.dateFrom) q = q.where('e.created_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('e.created_at', '<=', filters.dateTo)
    return q
  }

  private async countEnrollmentFiltered(organizationId: string, filters: ReportFilterInput) {
    const row = await this.enrollmentBase(organizationId, filters).countDistinct('e.id as total').first()
    return Number((row as { total?: string | number } | undefined)?.total ?? 0)
  }

  private async admissions(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db.from(t('applicants')).where('organization_id', scope.organizationId)
    if (filters.dateFrom) q = q.where('applied_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('applied_at', '<=', filters.dateTo)
    if (filters.programId) q = q.where('program_id', filters.programId)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const groups = await q.clone().select('status').count('* as count').groupBy('status')
    const rows = groups.map((g: any) => ({ status: g.status, count: Number(g.count) }))
    const actual = rows.reduce((s, r) => s + Number(r.count), 0)
    return this.baseResult(
      def,
      filters,
      rows,
      { applicants: actual },
      {
        ok: actual === expected,
        message: actual === expected ? 'Totals match applicant table' : 'Total mismatch',
        expectedTotal: expected,
        actualTotal: actual,
      }
    )
  }

  private async applicantStatistics(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db
      .from(`${t('applicants')} as a`)
      .leftJoin(`${t('programs')} as p`, 'p.id', 'a.program_id')
      .where('a.organization_id', scope.organizationId)
    if (filters.dateFrom) q = q.where('a.applied_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('a.applied_at', '<=', filters.dateTo)
    if (filters.programId) q = q.where('a.program_id', filters.programId)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const groups = await q
      .clone()
      .select('a.status', 'p.code as program_code', 'p.name as program_name')
      .count('* as count')
      .groupBy('a.status', 'p.code', 'p.name')
    const rows = groups.map((g: any) => ({
      status: g.status,
      programCode: g.program_code ?? 'UNASSIGNED',
      programName: g.program_name ?? 'Unassigned',
      count: Number(g.count),
    }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { applicants: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Totals match applicant table' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async studentPopulation(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db
      .from(`${t('students')} as s`)
      .leftJoin(`${t('programs')} as p`, 'p.id', 's.program_id')
      .where('s.organization_id', scope.organizationId)
    if (filters.campusId) q = q.where('s.mdm_campus_id', filters.campusId)
    if (filters.programId) q = q.where('s.program_id', filters.programId)
    if (filters.collegeCode) {
      q = q.whereRaw(`${collegeExpr('p')} = ?`, [filters.collegeCode.toUpperCase()])
    }
    if (filters.dateFrom) q = q.where('s.created_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('s.created_at', '<=', filters.dateTo)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const groups = await q.clone().select('s.status').count('* as count').groupBy('s.status')
    const rows = groups.map((g: any) => ({ status: g.status, count: Number(g.count) }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { students: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Totals match students table' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async enrollmentStatistics(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const expected = await this.countEnrollmentFiltered(scope.organizationId, filters)
    const groups = await this.enrollmentBase(scope.organizationId, filters)
      .select('e.status')
      .countDistinct('e.id as count')
      .groupBy('e.status')
    const rows = groups.map((g: any) => ({ status: g.status, count: Number(g.count) }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { enrollments: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Totals match enrollments table' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async enrollmentByCampus(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const expected = await this.countEnrollmentFiltered(scope.organizationId, filters)
    const groups = await this.enrollmentBase(scope.organizationId, filters)
      .leftJoin(`${t('campuses')} as c`, 'c.id', 's.mdm_campus_id')
      .select('s.mdm_campus_id as campus_id', 'c.code as campus_code', 'c.name as campus_name')
      .countDistinct('e.id as count')
      .groupBy('s.mdm_campus_id', 'c.code', 'c.name')
    const rows = groups.map((g: any) => ({
      campusId: g.campus_id ?? 'UNASSIGNED',
      campusCode: g.campus_code ?? 'UNASSIGNED',
      campusName: g.campus_name ?? 'Unassigned campus',
      count: Number(g.count),
    }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { enrollments: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Campus totals match filtered enrollments' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async enrollmentByCollege(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const expected = await this.countEnrollmentFiltered(scope.organizationId, filters)
    const groups = await this.enrollmentBase(scope.organizationId, filters)
      .select(db.raw(`${collegeExpr('p')} as college_code`))
      .countDistinct('e.id as count')
      .groupByRaw(collegeExpr('p'))
    const rows = groups.map((g: any) => ({
      collegeCode: g.college_code ?? 'UNASSIGNED',
      count: Number(g.count),
    }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { enrollments: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'College totals match filtered enrollments' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async enrollmentByProgram(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const expected = await this.countEnrollmentFiltered(scope.organizationId, filters)
    const groups = await this.enrollmentBase(scope.organizationId, filters)
      .select('p.code as program_code', 'p.name as program_name')
      .countDistinct('e.id as count')
      .groupBy('p.code', 'p.name')
    const rows = groups.map((g: any) => ({
      programCode: g.program_code ?? 'UNASSIGNED',
      programName: g.program_name ?? 'Unassigned',
      count: Number(g.count),
    }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { enrollments: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Program totals match filtered enrollments' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async enrollmentByYearLevel(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const expected = await this.countEnrollmentFiltered(scope.organizationId, filters)
    const groups = await this.enrollmentBase(scope.organizationId, filters)
      .select('e.year_level')
      .countDistinct('e.id as count')
      .groupBy('e.year_level')
      .orderBy('e.year_level')
    const rows = groups.map((g: any) => ({ yearLevel: Number(g.year_level), count: Number(g.count) }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { enrollments: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Year-level totals match filtered enrollments' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async subjectDemand(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const lineGroups = await this.enrollmentBase(scope.organizationId, filters)
      .join(`${t('enrollment_lines')} as el`, 'el.enrollment_id', 'e.id')
      .select('el.subject_code', 'el.subject_title')
      .count('* as demand')
      .groupBy('el.subject_code', 'el.subject_title')
      .orderBy('demand', 'desc')

    const adviseGroups = await this.enrollmentBase(scope.organizationId, filters)
      .join(`${t('advising_sessions')} as sess`, 'sess.enrollment_id', 'e.id')
      .join(`${t('advising_recommendations')} as ar`, 'ar.advising_session_id', 'sess.id')
      .select('ar.subject_code')
      .count('* as advising_demand')
      .groupBy('ar.subject_code')

    const adviseMap = new Map(
      adviseGroups.map((g: any) => [String(g.subject_code), Number(g.advising_demand)])
    )
    const rows = lineGroups.map((g: any) => ({
      subjectCode: g.subject_code,
      subjectTitle: g.subject_title,
      enrollmentDemand: Number(g.demand),
      advisingDemand: adviseMap.get(String(g.subject_code)) ?? 0,
    }))
    const total = rows.reduce((s, r) => s + r.enrollmentDemand, 0)
    const expected = Number(
      (
        await this.enrollmentBase(scope.organizationId, filters)
          .join(`${t('enrollment_lines')} as el`, 'el.enrollment_id', 'e.id')
          .count('* as total')
          .first()
      )?.total ?? 0
    )
    return this.baseResult(def, filters, rows, { enrollmentLineDemand: total }, {
      ok: total === expected,
      message: total === expected ? 'Subject demand matches enrollment_lines' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: total,
    })
  }

  private async classUtilization(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db.from(`${t('sections')} as sec`).where('sec.organization_id', scope.organizationId)
    if (filters.academicYearId) q = q.where('sec.academic_year_id', filters.academicYearId)
    if (filters.semester != null) q = q.where('sec.semester', filters.semester)
    if (filters.programId) q = q.where('sec.program_id', filters.programId)
    if (filters.yearLevel != null) q = q.where('sec.year_level', filters.yearLevel)
    const sections = await q.select(
      'sec.code',
      'sec.name',
      'sec.capacity',
      'sec.enrolled_count',
      'sec.year_level',
      'sec.semester'
    )
    const rows = sections.map((s: any) => {
      const capacity = Number(s.capacity ?? 0)
      const enrolled = Number(s.enrolled_count ?? 0)
      return {
        sectionCode: s.code,
        sectionName: s.name,
        yearLevel: Number(s.year_level),
        semester: Number(s.semester),
        capacity,
        enrolledCount: enrolled,
        utilizationPct: capacity > 0 ? Math.round((enrolled / capacity) * 10000) / 100 : null,
      }
    })
    const expected = sections.length
    return this.baseResult(def, filters, rows, { sections: rows.length }, {
      ok: rows.length === expected,
      message: 'Section utilization rows match sections query',
      expectedTotal: expected,
      actualTotal: rows.length,
    })
  }

  private async advisingCompletion(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const rowsRaw = await this.enrollmentBase(scope.organizationId, filters).select(
      'e.id',
      'e.status',
      'e.advising_waived'
    )
    const advised = rowsRaw.filter(
      (r: any) =>
        ['advised', 'assessed', 'payment_verified', 'registered'].includes(r.status) || r.advising_waived
    )
    const total = rowsRaw.length
    const advisedCount = advised.length
    const notAdvised = total - advisedCount
    const rows = [
      { metric: 'total', value: total },
      { metric: 'advised', value: advisedCount },
      { metric: 'notAdvised', value: notAdvised },
      { metric: 'completionRate', value: total ? Math.round((advisedCount / total) * 10000) / 100 : 0 },
    ]
    return this.baseResult(
      def,
      filters,
      rows,
      { total, advised: advisedCount, notAdvised },
      {
        ok: advisedCount + notAdvised === total,
        message: 'Advised + not advised equals enrollment total',
        expectedTotal: total,
        actualTotal: advisedCount + notAdvised,
      }
    )
  }

  private async studentDeficiencies(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db.from(t('student_deficiencies')).where('organization_id', scope.organizationId)
    if (filters.dateFrom) q = q.where('created_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('created_at', '<=', filters.dateTo)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const groups = await q
      .clone()
      .select('requirement_code', 'status')
      .count('* as count')
      .groupBy('requirement_code', 'status')
    const rows = groups.map((g: any) => ({
      requirementCode: g.requirement_code,
      status: g.status,
      count: Number(g.count),
    }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { deficiencies: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Deficiency totals match table' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async gradeSubmission(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db.from(t('class_records')).where('organization_id', scope.organizationId)
    if (filters.academicYearId) q = q.where('academic_year_id', filters.academicYearId)
    if (filters.semester != null) q = q.where('semester', filters.semester)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const groups = await q.clone().select('status').count('* as count').groupBy('status')
    const rows = groups.map((g: any) => ({ status: g.status, count: Number(g.count) }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { classRecords: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Class record totals match table' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async academicPerformance(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db.from(t('gwa_snapshots')).where('organization_id', scope.organizationId)
    if (filters.academicYearId) q = q.where('academic_year_id', filters.academicYearId)
    if (filters.semester != null) q = q.where('semester', filters.semester)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const agg = await q
      .clone()
      .avg('term_gwa as avg_term_gwa')
      .avg('cumulative_gwa as avg_cumulative_gwa')
      .count('* as snapshots')
      .first()
    const standing = await q.clone().select('academic_standing').count('* as count').groupBy('academic_standing')
    const rows = [
      {
        metric: 'avgTermGwa',
        value: agg?.avg_term_gwa != null ? Number(Number(agg.avg_term_gwa).toFixed(4)) : null,
      },
      {
        metric: 'avgCumulativeGwa',
        value:
          agg?.avg_cumulative_gwa != null ? Number(Number(agg.avg_cumulative_gwa).toFixed(4)) : null,
      },
      { metric: 'snapshots', value: Number(agg?.snapshots ?? 0) },
      ...standing.map((g: any) => ({
        metric: `standing:${g.academic_standing ?? 'unknown'}`,
        value: Number(g.count),
      })),
    ]
    const standingSum = standing.reduce((s: number, g: any) => s + Number(g.count), 0)
    return this.baseResult(def, filters, rows, { snapshots: expected }, {
      ok: standingSum === expected || expected === 0,
      message: 'Standing distribution counts match snapshot total',
      expectedTotal: expected,
      actualTotal: standingSum,
    })
  }

  private async scholarshipRecords(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    let q = db.from(t('scholarships')).where('organization_id', scope.organizationId)
    if (filters.academicYearId) q = q.where('academic_year_id', filters.academicYearId)
    if (filters.semester != null) q = q.where('semester', filters.semester)
    if (filters.dateFrom) q = q.where('awarded_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('awarded_at', '<=', filters.dateTo)
    const expectedCount = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const expectedAmount = Number((await q.clone().sum('amount as total').first())?.total ?? 0)
    const groups = await q
      .clone()
      .select('scholarship_code', 'name', 'status')
      .count('* as count')
      .sum('amount as amount')
      .groupBy('scholarship_code', 'name', 'status')
    const rows = groups.map((g: any) => ({
      scholarshipCode: g.scholarship_code,
      name: g.name,
      status: g.status,
      count: Number(g.count),
      amount: Number(g.amount ?? 0),
    }))
    const actualCount = rows.reduce((s, r) => s + r.count, 0)
    const actualAmount = rows.reduce((s, r) => s + r.amount, 0)
    return this.baseResult(
      def,
      filters,
      rows,
      { awards: actualCount, amount: actualAmount },
      {
        ok: actualCount === expectedCount && Math.abs(actualAmount - expectedAmount) < 0.01,
        message: 'Scholarship counts and amounts match table aggregates',
        expectedTotal: expectedCount,
        actualTotal: actualCount,
      }
    )
  }

  private allowedSupportOffices(permissions: string[]) {
    const offices: string[] = []
    if (
      permissions.includes('*') ||
      permissions.includes('admin') ||
      permissions.includes('sss.admin') ||
      permissions.includes('reports.read')
    ) {
      return ['guidance', 'health', 'osa', 'scholarship']
    }
    if (permissions.includes('guidance.read') || permissions.includes('guidance.write')) offices.push('guidance')
    if (permissions.includes('health.read') || permissions.includes('health.write')) offices.push('health')
    if (permissions.includes('osa.read') || permissions.includes('osa.write')) offices.push('osa')
    if (permissions.includes('scholarships.read') || permissions.includes('scholarships.write')) {
      offices.push('scholarship')
    }
    return offices
  }

  private async supportStatistics(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const offices = this.allowedSupportOffices(scope.permissions)
    let q = db
      .from(t('sss_service_requests'))
      .where('organization_id', scope.organizationId)
      .whereIn('office', offices)
    if (filters.dateFrom) q = q.where('created_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('created_at', '<=', filters.dateTo)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const groups = await q.clone().select('office', 'status').count('* as count').groupBy('office', 'status')
    const rows = groups.map((g: any) => ({
      office: g.office,
      status: g.status,
      count: Number(g.count),
      note: 'Aggregate only — case notes and clinical content excluded',
    }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { serviceRequests: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Support aggregates match scoped requests' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async queueStatistics(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const offices = this.allowedSupportOffices(scope.permissions).filter((o) => o !== 'scholarship')
    let q = db
      .from(t('sss_queue_tickets'))
      .where('organization_id', scope.organizationId)
      .whereIn('office', offices.length ? offices : ['guidance', 'health', 'osa'])
    if (filters.dateFrom) q = q.where('created_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('created_at', '<=', filters.dateTo)
    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const groups = await q.clone().select('office', 'status').count('* as count').groupBy('office', 'status')
    const rows = groups.map((g: any) => ({
      office: g.office,
      status: g.status,
      count: Number(g.count),
    }))
    const actual = rows.reduce((s, r) => s + r.count, 0)
    return this.baseResult(def, filters, rows, { tickets: actual }, {
      ok: actual === expected,
      message: actual === expected ? 'Queue totals match tickets table' : 'Total mismatch',
      expectedTotal: expected,
      actualTotal: actual,
    })
  }

  private async hemisEnrollmentExtract(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const pack = await hemisRegulatoryService.enrollmentExtract(scope.organizationId, filters)
    const rows = pack.rows as Record<string, unknown>[]
    const capped = pack.expectedTotal > rows.length
    return this.baseResult(
      def,
      filters,
      rows,
      {
        enrollments: pack.actualTotal,
        schemaVersion: pack.schemaVersion,
        capped: capped ? 1 : 0,
      },
      {
        ok: !capped && pack.actualTotal === pack.expectedTotal,
        message: capped
          ? `Export capped at ${rows.length} rows; narrow filters for full HEMIS file`
          : pack.actualTotal === pack.expectedTotal
            ? 'HEMIS enrollment rows match filtered enrollment count'
            : 'Row count mismatch',
        expectedTotal: pack.expectedTotal,
        actualTotal: pack.actualTotal,
      }
    )
  }

  private async hemisStudentDemographics(
    scope: Scope,
    filters: ReportFilterInput,
    def: (typeof USIS_REPORT_DEFINITIONS)[number]
  ) {
    const pack = await hemisRegulatoryService.studentDemographicsExtract(scope.organizationId, filters)
    const rows = pack.rows as Record<string, unknown>[]
    const capped = pack.expectedTotal > rows.length
    return this.baseResult(
      def,
      filters,
      rows,
      {
        students: pack.actualTotal,
        schemaVersion: pack.schemaVersion,
        capped: capped ? 1 : 0,
      },
      {
        ok: !capped && pack.actualTotal === pack.expectedTotal,
        message: capped
          ? `Export capped at ${rows.length} rows; narrow filters for full HEMIS file`
          : pack.actualTotal === pack.expectedTotal
            ? 'HEMIS student rows match filtered student count'
            : 'Row count mismatch',
        expectedTotal: pack.expectedTotal,
        actualTotal: pack.actualTotal,
      }
    )
  }
}

export const usisAnalyticsService = new UsisAnalyticsService()
