import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import GradeEntry from '#modules/enrollment/models/grade_entry'
import Enrollment from '#modules/enrollment/models/enrollment'
import Subject from '#modules/enrollment/models/subject'
import Section from '#modules/enrollment/models/section'
import StudentDeficiency from '#modules/enrollment/models/student_deficiency'
import UnitLoadPolicy from '#modules/enrollment/models/unit_load_policy'
import EnrollmentOverride from '#modules/enrollment/models/enrollment_override'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import {
  EnrollmentWorkflowError,
  type OverrideType,
} from '#modules/enrollment/domain/enrollment_workflow'

export type CurriculumRemainingSubject = {
  id: string
  subjectCode: string
  title: string
  units: number
  yearLevel: number | null
  semester: number | null
}

export type CurriculumEvaluation = {
  taken: Array<{ subjectCode: string; status: string; grade: number | null }>
  passed: string[]
  failed: string[]
  dropped: string[]
  incomplete: string[]
  creditedInternal: string[]
  creditedExternal: string[]
  creditedEquivalent: string[]
  assessedSubjects: string[]
  remaining: CurriculumRemainingSubject[]
  currentTermRemaining: CurriculumRemainingSubject[]
  planByTerm: Array<{
    yearLevel: number
    semester: number
    subjects: CurriculumRemainingSubject[]
  }>
  deficiencies: Array<{ requirementCode: string; description: string }>
  academicStanding: string
  residencyTerms: number
  allowableUnitLoad: { minUnits: number; maxUnits: number; overloadMaxUnits: number | null }
}

export async function evaluateCurriculum(input: {
  organizationId: string
  studentId: string
  programId?: string | null
  yearLevel?: number | null
}): Promise<CurriculumEvaluation> {
  const enrollments = await Enrollment.query()
    .where({ organization_id: input.organizationId, student_id: input.studentId })
    .whereIn('status', ['registered', 'assessed', 'payment_verified', 'advised'])

  const enrollmentIds = enrollments.map((e) => e.id)
  const grades =
    enrollmentIds.length === 0
      ? []
      : await GradeEntry.query().whereIn('enrollment_id', enrollmentIds)

  const taken: CurriculumEvaluation['taken'] = []
  const passed: string[] = []
  const failed: string[] = []
  const dropped: string[] = []
  const incomplete: string[] = []

  for (const g of grades) {
    const remarks = (g.remarks ?? '').toUpperCase()
    const code = g.courseCode
    taken.push({ subjectCode: code, status: remarks || 'graded', grade: g.grade })
    if (remarks === 'DRP' || remarks === 'DROPPED') dropped.push(code)
    else if (remarks === 'INC' || remarks === 'INCOMPLETE') incomplete.push(code)
    else if (g.grade != null && Number(g.grade) <= 3.0) passed.push(code)
    else if (g.grade != null && Number(g.grade) > 3.0) failed.push(code)
    else if (remarks === 'FAILED') failed.push(code)
    else if (remarks === 'PASSED') passed.push(code)
  }

  const credits = await db.from(t('student_subject_credits')).where({
    organization_id: input.organizationId,
    student_id: input.studentId,
    status: 'credited',
  })

  const creditedInternal = credits.filter((c) => c.credit_type === 'internal').map((c) => c.subject_code)
  const creditedExternal = credits.filter((c) => c.credit_type === 'external').map((c) => c.subject_code)
  const creditedEquivalent = credits
    .filter((c) => c.credit_type === 'equivalent')
    .map((c) => c.subject_code)

  const enrolledCodes =
    enrollmentIds.length === 0
      ? []
      : (
          await EnrollmentLine.query()
            .whereIn('enrollment_id', enrollmentIds)
            .where((query) => {
              query.whereNull('status').orWhereNotIn('status', ['dropped', 'withdrawn'])
            })
        )
          .map((line) => line.subjectCode)
          .filter((code): code is string => Boolean(code))
  const assessedSubjects = [...new Set(enrolledCodes)]

  const completed = new Set([
    ...passed,
    ...creditedInternal,
    ...creditedExternal,
    ...creditedEquivalent,
    ...assessedSubjects,
  ])

  let remaining: CurriculumEvaluation['remaining'] = []
  let usedCurriculumVersion = false
  if (input.programId) {
    const { curriculumService } = await import('#modules/enrollment/services/curriculum_service')
    const versionSubjects = await curriculumService.getActiveVersionSubjectsForProgram(
      input.organizationId,
      input.programId
    )
    if (versionSubjects) {
      usedCurriculumVersion = true
      remaining = versionSubjects
        .filter((line) => line.subject && !completed.has(line.subject.subjectCode))
        .map((line) => ({
          id: line.subject!.id,
          subjectCode: line.subject!.subjectCode,
          title: line.subject!.title,
          units: line.subject!.units,
          yearLevel: line.yearLevel ?? null,
          semester: line.semester ?? null,
        }))
    }
  }
  if (!usedCurriculumVersion) {
    const subjects = await Subject.query()
      .where('organization_id', input.organizationId)
      .where('is_active', true)
      .if(input.programId, (q) =>
        q.where((builder) => builder.where('program_id', input.programId!).orWhereNull('program_id'))
      )
    remaining = subjects
      .filter((s) => !completed.has(s.subjectCode))
      .map((s) => ({
        id: s.id,
        subjectCode: s.subjectCode,
        title: s.title,
        units: s.units,
        yearLevel: null,
        semester: null,
      }))
  }

  const currentTermRemaining =
    input.yearLevel != null
      ? remaining.filter((line) => line.yearLevel == null || line.yearLevel === input.yearLevel)
      : remaining

  const planMap = new Map<string, CurriculumRemainingSubject[]>()
  for (const line of remaining) {
    const yl = line.yearLevel ?? 0
    const sem = line.semester ?? 0
    const key = `${yl}:${sem}`
    const bucket = planMap.get(key) ?? []
    bucket.push(line)
    planMap.set(key, bucket)
  }
  const planByTerm = [...planMap.entries()]
    .map(([key, subjects]) => {
      const [yearLevel, semester] = key.split(':').map((n) => Number(n))
      return { yearLevel, semester, subjects }
    })
    .sort((a, b) => a.yearLevel - b.yearLevel || a.semester - b.semester)

  const deficiencies = await StudentDeficiency.query()
    .where({ organization_id: input.organizationId, student_id: input.studentId })
    .whereNull('deleted_at')
    .whereIn('status', ['open', 'submitted', 'rejected'])

  const policy = await resolveUnitLoadPolicy(input.organizationId, input.programId ?? null, input.yearLevel ?? null)

  const residencyTerms = enrollments.filter((e) => e.status === 'registered').length
  let academicStanding = 'good'
  if (failed.length >= 3) academicStanding = 'warning'
  if (incomplete.length >= 2) academicStanding = 'incomplete_monitor'
  // Standing thresholds are configurable university policy — values above are operational defaults for system behavior only.

  return {
    taken,
    passed,
    failed,
    dropped,
    incomplete,
    creditedInternal,
    creditedExternal,
    creditedEquivalent,
    assessedSubjects,
    remaining,
    currentTermRemaining,
    planByTerm,
    deficiencies: deficiencies.map((d) => ({
      requirementCode: d.requirementCode,
      description: d.description,
    })),
    academicStanding,
    residencyTerms,
    allowableUnitLoad: {
      minUnits: Number(policy.minUnits),
      maxUnits: Number(policy.maxUnits),
      overloadMaxUnits: policy.overloadMaxUnits != null ? Number(policy.overloadMaxUnits) : null,
    },
  }
}

export async function resolveUnitLoadPolicy(
  organizationId: string,
  programId: string | null,
  yearLevel: number | null
) {
  const rows = await UnitLoadPolicy.query()
    .where('organization_id', organizationId)
    .where('is_active', true)

  const match =
    rows.find((r) => r.programId === programId && r.yearLevel === yearLevel) ||
    rows.find((r) => r.programId === programId && r.yearLevel == null) ||
    rows.find((r) => r.programId == null && r.yearLevel == null)

  if (match) return match

  return {
    minUnits: 12,
    maxUnits: 21,
    overloadMaxUnits: 24,
  }
}

export type ValidationIssue = {
  type: OverrideType
  message: string
}

export async function validateEnrollmentLines(input: {
  organizationId: string
  enrollmentId: string
  studentId: string
  lines: Array<{ subjectId?: string | null; subjectCode: string; units: number; sectionId?: string | null }>
  overloadApproved?: boolean
  underloadApproved?: boolean
  programId?: string | null
  yearLevel?: number | null
}): Promise<{ ok: boolean; issues: ValidationIssue[]; totalUnits: number }> {
  const issues: ValidationIssue[] = []
  const totalUnits = input.lines.reduce((sum, l) => sum + Number(l.units), 0)
  const evaluation = await evaluateCurriculum({
    organizationId: input.organizationId,
    studentId: input.studentId,
    programId: input.programId,
    yearLevel: input.yearLevel,
  })

  const overrides = await EnrollmentOverride.query().where('enrollment_id', input.enrollmentId)
  const overridden = new Set(overrides.map((o) => o.overrideType))

  const completed = new Set([
    ...evaluation.passed,
    ...evaluation.creditedInternal,
    ...evaluation.creditedExternal,
    ...evaluation.creditedEquivalent,
  ])

  for (const line of input.lines) {
    if (!line.subjectId) continue
    const prereqs = await db
      .from(t('subject_prerequisites'))
      .where('subject_id', line.subjectId)
    for (const p of prereqs) {
      const req = await Subject.find(p.requires_subject_id)
      if (req && !completed.has(req.subjectCode) && !overridden.has('prerequisite')) {
        issues.push({
          type: 'prerequisite',
          message: `${line.subjectCode} requires ${req.subjectCode}`,
        })
      }
    }

    const coreqs = await db.from(t('subject_corequisites')).where('subject_id', line.subjectId)
    const lineCodes = new Set(input.lines.map((l) => l.subjectCode))
    for (const c of coreqs) {
      const req = await Subject.find(c.corequisite_subject_id)
      if (req && !lineCodes.has(req.subjectCode) && !completed.has(req.subjectCode) && !overridden.has('corequisite')) {
        issues.push({
          type: 'corequisite',
          message: `${line.subjectCode} requires co-requisite ${req.subjectCode}`,
        })
      }
    }

    if (line.sectionId) {
      const section = await Section.find(line.sectionId)
      if (section?.capacity != null) {
        const seated = await EnrollmentLine.query()
          .where('section_id', line.sectionId)
          .whereIn('status', ['planned', 'registered'])
          .whereNot('enrollment_id', input.enrollmentId)
        if (seated.length >= section.capacity && !overridden.has('section_capacity')) {
          if (section.waitlistEnabled) {
            issues.push({
              type: 'section_waitlist',
              message: `Section ${section.code} is full — use waitlist if you need this section`,
            })
          } else {
            issues.push({
              type: 'section_capacity',
              message: `Section ${section.code} is at capacity`,
            })
          }
        }
      }
    }
  }

  const { minUnits, maxUnits, overloadMaxUnits } = evaluation.allowableUnitLoad
  if (totalUnits < minUnits && !input.underloadApproved && !overridden.has('unit_load')) {
    issues.push({ type: 'unit_load', message: `Below minimum load of ${minUnits} units` })
  }
  const hardMax = overloadMaxUnits ?? maxUnits
  if (totalUnits > maxUnits && !input.overloadApproved && !overridden.has('unit_load')) {
    issues.push({ type: 'unit_load', message: `Exceeds maximum load of ${maxUnits} units` })
  }
  if (totalUnits > hardMax && !overridden.has('unit_load')) {
    issues.push({ type: 'unit_load', message: `Exceeds absolute overload limit of ${hardMax} units` })
  }

  const holdCodes = new Set(['FINANCIAL_HOLD', 'CLEARANCE_HOLD'])
  const academicDeficiencies = evaluation.deficiencies.filter((d) => !holdCodes.has(d.requirementCode))
  if (academicDeficiencies.length > 0 && !overridden.has('deficiency')) {
    issues.push({
      type: 'deficiency',
      message: `Open academic/requirement deficiencies: ${academicDeficiencies.map((d) => d.requirementCode).join(', ')}`,
    })
  }

  if (
    evaluation.deficiencies.some((d) => d.requirementCode === 'FINANCIAL_HOLD') &&
    !overridden.has('financial_hold')
  ) {
    issues.push({ type: 'financial_hold', message: 'Financial hold is active' })
  }

  if (
    evaluation.deficiencies.some((d) => d.requirementCode === 'CLEARANCE_HOLD') &&
    !overridden.has('clearance')
  ) {
    issues.push({ type: 'clearance', message: 'Clearance restriction is active' })
  }

  return { ok: issues.length === 0, issues, totalUnits }
}

export function assertValidationOrThrow(
  result: { ok: boolean; issues: ValidationIssue[] },
  allowPartial = false
) {
  if (!result.ok && !allowPartial) {
    throw new EnrollmentWorkflowError('Enrollment validation failed', 422, 'ENROLLMENT_VALIDATION_FAILED', {
      issues: result.issues,
    })
  }
}
