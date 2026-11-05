import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import {
  HEMIS_ENROLLMENT_COLUMNS,
  HEMIS_SCHEMA_VERSION,
  HEMIS_STUDENT_COLUMNS,
  type HemisEnrollmentRow,
  type HemisStudentRow,
} from '#modules/enrollment/domain/hemis_export_schema'
import type { ReportFilterInput } from '#modules/enrollment/domain/usis_reports'

function collegeExpr(alias = 'p') {
  return `UPPER(COALESCE(NULLIF(SPLIT_PART(${alias}.code, '-', 1), ''), 'UNASSIGNED'))`
}

export class HemisRegulatoryService {
  async institutionCode(organizationId: string) {
    const org = await Organization.find(organizationId)
    return org?.code?.toUpperCase() ?? 'UNI'
  }

  private enrollmentQuery(organizationId: string, filters: ReportFilterInput) {
    let q = db
      .from(`${t('enrollments')} as e`)
      .join(`${t('students')} as s`, 's.id', 'e.student_id')
      .join(`${t('organizations')} as o`, 'o.id', 'e.organization_id')
      .leftJoin(`${t('programs')} as p`, 'p.id', 's.program_id')
      .leftJoin(`${t('academic_years')} as ay`, 'ay.id', 'e.academic_year_id')
      .where('e.organization_id', organizationId)
    if (filters.academicYearId) q = q.where('e.academic_year_id', filters.academicYearId)
    if (filters.semester != null) q = q.where('e.semester', filters.semester)
    if (filters.campusId) q = q.where('s.mdm_campus_id', filters.campusId)
    if (filters.programId) q = q.where('s.program_id', filters.programId)
    if (filters.yearLevel != null) q = q.where('e.year_level', filters.yearLevel)
    if (filters.collegeCode) q = q.whereRaw(`${collegeExpr('p')} = ?`, [filters.collegeCode.toUpperCase()])
    if (filters.dateFrom) q = q.where('e.created_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('e.created_at', '<=', filters.dateTo)
    return q
  }

  async enrollmentExtract(organizationId: string, filters: ReportFilterInput) {
    const expected = Number(
      (await this.enrollmentQuery(organizationId, filters).clone().countDistinct('e.id as total').first())?.total ?? 0
    )
    const raw = await this.enrollmentQuery(organizationId, filters)
      .clone()
      .select(
        'o.code as institution_code',
        'ay.code as academic_year_code',
        'e.semester',
        's.student_number',
        's.last_name',
        's.first_name',
        's.middle_name',
        's.birth_date',
        'p.code as program_code',
        'p.name as program_name',
        'e.year_level',
        'e.status as enrollment_status',
        's.mdm_campus_id as campus_ref',
        's.status as student_status',
        's.classification'
      )
      .orderBy('s.student_number', 'asc')
      .limit(5000)

    const rows: HemisEnrollmentRow[] = raw.map((r: Record<string, unknown>) => ({
      institution_code: String(r.institution_code ?? '').toUpperCase(),
      academic_year_code: r.academic_year_code ? String(r.academic_year_code) : '',
      semester: r.semester != null ? Number(r.semester) : null,
      student_number: String(r.student_number ?? ''),
      last_name: String(r.last_name ?? ''),
      first_name: String(r.first_name ?? ''),
      middle_name: r.middle_name ? String(r.middle_name) : '',
      birth_date: r.birth_date ? String(r.birth_date).slice(0, 10) : '',
      program_code: r.program_code ? String(r.program_code) : '',
      program_name: r.program_name ? String(r.program_name) : '',
      year_level: r.year_level != null ? Number(r.year_level) : null,
      enrollment_status: String(r.enrollment_status ?? ''),
      campus_ref: r.campus_ref ? String(r.campus_ref) : '',
      student_status: String(r.student_status ?? ''),
      classification: r.classification ? String(r.classification) : '',
    }))

    return {
      schemaVersion: HEMIS_SCHEMA_VERSION,
      columns: [...HEMIS_ENROLLMENT_COLUMNS],
      rows,
      expectedTotal: expected,
      actualTotal: rows.length,
    }
  }

  async studentDemographicsExtract(organizationId: string, filters: ReportFilterInput) {
    let q = db
      .from(`${t('students')} as s`)
      .join(`${t('organizations')} as o`, 'o.id', 's.organization_id')
      .leftJoin(`${t('programs')} as p`, 'p.id', 's.program_id')
      .where('s.organization_id', organizationId)
    if (filters.campusId) q = q.where('s.mdm_campus_id', filters.campusId)
    if (filters.programId) q = q.where('s.program_id', filters.programId)
    if (filters.yearLevel != null) q = q.where('s.year_level', filters.yearLevel)
    if (filters.collegeCode) q = q.whereRaw(`${collegeExpr('p')} = ?`, [filters.collegeCode.toUpperCase()])
    if (filters.dateFrom) q = q.where('s.created_at', '>=', filters.dateFrom)
    if (filters.dateTo) q = q.where('s.created_at', '<=', filters.dateTo)

    const expected = Number((await q.clone().count('* as total').first())?.total ?? 0)
    const raw = await q
      .clone()
      .select(
        'o.code as institution_code',
        's.student_number',
        's.last_name',
        's.first_name',
        's.middle_name',
        's.birth_date',
        's.email',
        's.mobile',
        'p.code as program_code',
        'p.name as program_name',
        's.year_level',
        's.status as student_status',
        's.mdm_campus_id as campus_ref',
        's.classification'
      )
      .orderBy('s.student_number', 'asc')
      .limit(5000)

    const rows: HemisStudentRow[] = raw.map((r: Record<string, unknown>) => ({
      institution_code: String(r.institution_code ?? '').toUpperCase(),
      student_number: String(r.student_number ?? ''),
      last_name: String(r.last_name ?? ''),
      first_name: String(r.first_name ?? ''),
      middle_name: r.middle_name ? String(r.middle_name) : '',
      birth_date: r.birth_date ? String(r.birth_date).slice(0, 10) : '',
      email: String(r.email ?? ''),
      mobile: r.mobile ? String(r.mobile) : '',
      program_code: r.program_code ? String(r.program_code) : '',
      program_name: r.program_name ? String(r.program_name) : '',
      year_level: r.year_level != null ? Number(r.year_level) : null,
      student_status: String(r.student_status ?? ''),
      campus_ref: r.campus_ref ? String(r.campus_ref) : '',
      classification: r.classification ? String(r.classification) : '',
    }))

    return {
      schemaVersion: HEMIS_SCHEMA_VERSION,
      columns: [...HEMIS_STUDENT_COLUMNS],
      rows,
      expectedTotal: expected,
      actualTotal: rows.length,
    }
  }

  schemaCatalog() {
    return {
      schemaVersion: HEMIS_SCHEMA_VERSION,
      note:
        'Demo HEMIS-shaped column layout for ENR-034. Official CHED field codes and submission calendar require university sign-off before production certification.',
      datasets: [
        { id: 'hemis-enrollment-extract', columns: [...HEMIS_ENROLLMENT_COLUMNS] },
        { id: 'hemis-student-demographics', columns: [...HEMIS_STUDENT_COLUMNS] },
      ],
    }
  }
}

export const hemisRegulatoryService = new HemisRegulatoryService()
