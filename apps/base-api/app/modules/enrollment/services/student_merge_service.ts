import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import Student from '#modules/enrollment/models/student'
import UsisStudentMergeJob from '#modules/enrollment/models/usis_student_merge_job'
import { STUDENT_CLASSIFICATIONS } from '#modules/enrollment/domain/enrollment_workflow'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

function badRequest(message: string, code = 'E_VALIDATION_FAILURE') {
  return new Exception(message, { status: 422, code })
}

type ReassignSpec = {
  table: string
  column: string
  conflictSql?: string
}

const STUDENT_FK_REASSIGNS: ReassignSpec[] = [
  { table: 'adviser_assignments', column: 'student_id' },
  { table: 'assessment_aid_tags', column: 'student_id' },
  {
    table: 'attendance_records',
    column: 'student_id',
    conflictSql: `EXISTS (
      SELECT 1 FROM ${t('attendance_records')} s
      WHERE s.class_record_id = ${t('attendance_records')}.class_record_id
        AND s.session_date = ${t('attendance_records')}.session_date
        AND s.student_id = ?
    )`,
  },
  { table: 'balance_snapshots', column: 'student_id' },
  { table: 'counseling_case_notes', column: 'student_id' },
  { table: 'counseling_requests', column: 'student_id' },
  { table: 'counseling_sessions', column: 'student_id' },
  { table: 'discipline_cases', column: 'student_id' },
  { table: 'discipline_complaints', column: 'respondent_student_id' },
  { table: 'discipline_sanctions', column: 'student_id' },
  { table: 'grade_entries', column: 'student_id' },
  { table: 'guidance_referrals', column: 'student_id' },
  { table: 'gwa_snapshots', column: 'student_id' },
  { table: 'health_clearances', column: 'student_id' },
  { table: 'health_clinical_notes', column: 'student_id' },
  { table: 'health_conditions', column: 'student_id' },
  { table: 'health_encounters', column: 'student_id' },
  { table: 'health_prescriptions', column: 'student_id' },
  { table: 'health_program_participations', column: 'student_id' },
  {
    table: 'health_records',
    column: 'student_id',
    conflictSql: `EXISTS (
      SELECT 1 FROM ${t('health_records')} s
      WHERE s.organization_id = ${t('health_records')}.organization_id
        AND s.student_id = ?
    )`,
  },
  { table: 'health_referrals', column: 'student_id' },
  { table: 'medical_alerts', column: 'student_id' },
  {
    table: 'org_memberships',
    column: 'student_id',
    conflictSql: `EXISTS (
      SELECT 1 FROM ${t('org_memberships')} s
      WHERE s.student_org_id = ${t('org_memberships')}.student_org_id
        AND s.student_id = ?
    )`,
  },
  { table: 'payments', column: 'student_id' },
  { table: 'psych_test_results', column: 'student_id' },
  { table: 'scholarship_applications', column: 'student_id' },
  { table: 'scholarships', column: 'student_id' },
  { table: 'shifting_exam_applications', column: 'student_id' },
  { table: 'sss_notifications_outbox', column: 'student_id' },
  { table: 'sss_queue_tickets', column: 'student_id' },
  { table: 'sss_sensitive_access_logs', column: 'student_id' },
  { table: 'sss_service_requests', column: 'student_id' },
  { table: 'student_assistant_applications', column: 'student_id' },
  { table: 'student_deficiencies', column: 'student_id' },
  { table: 'student_id_requests', column: 'student_id' },
  { table: 'student_subject_credits', column: 'student_id' },
  { table: 'usis_clearance_reports', column: 'student_id' },
  {
    table: 'usis_faculty_eval_responses',
    column: 'student_id',
    conflictSql: `EXISTS (
      SELECT 1 FROM ${t('usis_faculty_eval_responses')} s
      WHERE s.target_id = ${t('usis_faculty_eval_responses')}.target_id
        AND s.student_id = ?
    )`,
  },
  { table: 'usis_scheduling_notifications', column: 'student_id' },
  { table: 'usis_section_waitlist_entries', column: 'student_id' },
  { table: 'usis_student_import_accepted', column: 'student_id' },
]

const ENROLLMENT_CHILD_TABLES = [
  'advising_history',
  'advising_sessions',
  'advising_waivers',
  'assessment_aid_tags',
  'assessments',
  'balance_snapshots',
  'enrollment_change_requests',
  'enrollment_lines',
  'enrollment_overrides',
  'enrollment_status_history',
  'finance_integration_transactions',
  'grade_entries',
  'payments',
  'registration_documents',
  'usis_section_waitlist_entries',
] as const

export class StudentMergeService {
  listClassifications() {
    return STUDENT_CLASSIFICATIONS.map((code) => ({
      code,
      label: code
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
    }))
  }

  async listMergeJobs(organizationId: string) {
    return UsisStudentMergeJob.query()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
      .limit(50)
  }

  async updateStudentProfile(
    organizationId: string,
    studentId: string,
    input: {
      classification?: string | null
      mdmCampusId?: string | null
      yearLevel?: number | null
      status?: string
    },
    actorUserId: string
  ) {
    const student = await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .whereNull('deleted_at')
      .firstOrFail()

    if (input.classification !== undefined) {
      const next = input.classification
      if (next !== null && next !== '' && !(STUDENT_CLASSIFICATIONS as readonly string[]).includes(next)) {
        throw badRequest('Invalid student classification', 'INVALID_CLASSIFICATION')
      }
      const previous = student.classification
      const normalized = next && next.length > 0 ? next : null
      if (previous !== normalized) {
        student.classification = normalized
        await db.table(t('usis_student_classification_history')).insert({
          id: randomUUID(),
          organization_id: organizationId,
          student_id: student.id,
          applicant_id: null,
          from_classification: previous,
          to_classification: normalized ?? 'cleared',
          changed_by: actorUserId,
          note: 'Registrar classification update',
          created_at: DateTime.now().toSQL(),
        })
      }
    }

    if (input.mdmCampusId !== undefined) {
      student.mdmCampusId = input.mdmCampusId
    }
    if (input.yearLevel !== undefined) {
      student.yearLevel = input.yearLevel
    }
    if (input.status !== undefined) {
      if (!['active', 'inactive', 'graduated', 'withdrawn'].includes(input.status)) {
        throw badRequest('Invalid student status')
      }
      student.status = input.status
    }

    await student.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student',
      entityId: student.id,
    })
    return student
  }

  async mergeStudents(
    organizationId: string,
    input: { survivorStudentId: string; duplicateStudentId: string; note?: string | null },
    actorUserId: string
  ) {
    if (input.survivorStudentId === input.duplicateStudentId) {
      throw badRequest('Survivor and duplicate must be different students')
    }

    const survivor = await Student.query()
      .where('organization_id', organizationId)
      .where('id', input.survivorStudentId)
      .whereNull('deleted_at')
      .firstOrFail()

    const duplicate = await Student.query()
      .where('organization_id', organizationId)
      .where('id', input.duplicateStudentId)
      .whereNull('deleted_at')
      .firstOrFail()

    if (survivor.status === 'merged' || duplicate.status === 'merged') {
      throw badRequest('One of the selected students is already merged')
    }

    const report: Record<string, unknown> = {
      reassigned: {} as Record<string, number>,
      deletedConflicts: {} as Record<string, number>,
      enrollmentConflictsResolved: 0,
      enrollmentsMoved: 0,
    }

    const trx = await db.transaction()
    try {
      const enrollmentMoves = await this.resolveEnrollmentConflicts(
        trx,
        survivor.id,
        duplicate.id,
        report
      )
      report.enrollmentsMoved = enrollmentMoves

      for (const spec of STUDENT_FK_REASSIGNS) {
        const { moved, deleted } = await this.reassignFk(trx, spec, survivor.id, duplicate.id)
        ;(report.reassigned as Record<string, number>)[`${spec.table}.${spec.column}`] = moved
        if (deleted > 0) {
          ;(report.deletedConflicts as Record<string, number>)[`${spec.table}.${spec.column}`] =
            deleted
        }
      }

      if (!survivor.classification && duplicate.classification) {
        survivor.classification = duplicate.classification
      }
      if (!survivor.mdmCampusId && duplicate.mdmCampusId) {
        survivor.mdmCampusId = duplicate.mdmCampusId
      }
      if (!survivor.platformUserId && duplicate.platformUserId) {
        survivor.platformUserId = duplicate.platformUserId
      }
      if (!survivor.applicantId && duplicate.applicantId) {
        survivor.applicantId = duplicate.applicantId
      }
      if (!survivor.programId && duplicate.programId) {
        survivor.programId = duplicate.programId
      }
      await survivor.useTransaction(trx).save()

      const stamp = DateTime.now().toFormat('yyyyMMddHHmmss')
      duplicate.status = 'merged'
      duplicate.mergedIntoStudentId = survivor.id
      duplicate.deletedAt = DateTime.now()
      duplicate.email = `merged+${duplicate.id.slice(0, 8)}.${stamp}@merged.local`
      duplicate.studentNumber = `MERGED-${duplicate.id.slice(0, 8)}-${stamp}`
      duplicate.platformUserId = null
      await duplicate.useTransaction(trx).save()

      const job = await UsisStudentMergeJob.create(
        {
          organizationId,
          survivorStudentId: survivor.id,
          duplicateStudentId: duplicate.id,
          status: 'completed',
          reportJson: report,
          note: input.note?.trim() || null,
          createdBy: actorUserId,
          completedAt: DateTime.now(),
        },
        { client: trx }
      )

      await trx.commit()

      await auditLogService.log({
        organizationId,
        actorUserId,
        action: AuditAction.UPDATE,
        entityType: 'student_merge',
        entityId: job.id,
      })

      return { job, survivor, duplicate }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async resolveEnrollmentConflicts(
    trx: Awaited<ReturnType<typeof db.transaction>>,
    survivorId: string,
    duplicateId: string,
    report: Record<string, unknown>
  ) {
    const dupEnrollments = await trx
      .from(t('enrollments'))
      .where('student_id', duplicateId)
      .select('id', 'academic_year_id', 'semester')

    let moved = 0
    let conflicts = 0

    for (const dup of dupEnrollments) {
      const survivorEnrollment = await trx
        .from(t('enrollments'))
        .where('student_id', survivorId)
        .where('academic_year_id', dup.academic_year_id)
        .where('semester', dup.semester)
        .first()

      if (!survivorEnrollment) {
        await trx.from(t('enrollments')).where('id', dup.id).update({ student_id: survivorId })
        moved += 1
        continue
      }

      for (const child of ENROLLMENT_CHILD_TABLES) {
        await trx
          .from(t(child))
          .where('enrollment_id', dup.id)
          .update({ enrollment_id: survivorEnrollment.id })
      }
      await trx.from(t('enrollments')).where('id', dup.id).delete()
      conflicts += 1
    }

    report.enrollmentConflictsResolved = conflicts
    return moved
  }

  private async reassignFk(
    trx: Awaited<ReturnType<typeof db.transaction>>,
    spec: ReassignSpec,
    survivorId: string,
    duplicateId: string
  ) {
    let deleted = 0
    if (spec.conflictSql) {
      deleted = await trx
        .from(t(spec.table))
        .where(spec.column, duplicateId)
        .whereRaw(spec.conflictSql, [survivorId])
        .delete()
    }

    const moved = await trx
      .from(t(spec.table))
      .where(spec.column, duplicateId)
      .update({ [spec.column]: survivorId })

    return { moved, deleted }
  }
}

export const studentMergeService = new StudentMergeService()
