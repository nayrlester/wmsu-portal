import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'
import { usisAcademicClient } from '#modules/records/services/integrations/usis_academic_client'

export type LedgerGradeInput = {
  academicYear: string
  semester: number
  courseCode: string
  courseTitle: string
  units: number
  grade: number | null
  remarks: string | null
  sourceEntryId?: string | null
  originalGrade?: number | null
  modifiedGrade?: number | null
  programCode?: string | null
}

export class AcademicSyncService {
  async ingestGrades(input: {
    organizationId: string
    studentNumber: string
    grades: LedgerGradeInput[]
    actorUserId?: string | null
    source?: string
  }) {
    const startedAt = new Date()
    const trx = await db.transaction()

    try {
      const [syncRun] = await trx
        .table(t('torms_sync_runs'))
        .insert({
          organization_id: input.organizationId,
          source: input.source ?? 'usis_push',
          direction: 'inbound',
          status: 'running',
          records_received: input.grades.length,
          records_upserted: 0,
          discrepancy_count: 0,
          started_at: startedAt,
          created_at: startedAt,
        })
        .returning('*')

      let upserted = 0
      let discrepancies = 0

      for (const g of input.grades) {
        const sourceEntryId = g.sourceEntryId?.trim() || ''
        let existing = await trx
          .from(t('academic_ledger_lines'))
          .where({
            organization_id: input.organizationId,
            student_number: input.studentNumber,
            academic_year: g.academicYear,
            semester: g.semester,
            course_code: g.courseCode,
            source_entry_id: sourceEntryId,
          })
          .first()

        if (!existing && sourceEntryId) {
          existing = await trx
            .from(t('academic_ledger_lines'))
            .where({
              organization_id: input.organizationId,
              student_number: input.studentNumber,
              academic_year: g.academicYear,
              semester: g.semester,
              course_code: g.courseCode,
              source_entry_id: '',
            })
            .first()
        }

        if (existing && existing.grade !== null && g.grade !== null && Number(existing.grade) !== Number(g.grade)) {
          await trx.table(t('torms_sync_discrepancies')).insert({
            organization_id: input.organizationId,
            sync_run_id: syncRun.id,
            student_number: input.studentNumber,
            field: `${g.courseCode}.grade`,
            usis_value: String(g.grade),
            local_value: String(existing.grade),
            status: 'open',
            created_at: new Date(),
          })
          discrepancies += 1
        }

        const row = {
          organization_id: input.organizationId,
          student_number: input.studentNumber,
          academic_year: g.academicYear,
          semester: g.semester,
          course_code: g.courseCode,
          course_title: g.courseTitle,
          units: g.units,
          grade: g.grade,
          remarks: g.remarks,
          source_entry_id: sourceEntryId,
          original_grade: g.originalGrade ?? existing?.original_grade ?? g.grade,
          modified_grade: g.modifiedGrade ?? g.grade,
          program_code: g.programCode ?? existing?.program_code ?? null,
          sync_run_id: syncRun.id,
          synced_at: new Date(),
          updated_at: new Date(),
        }

        if (existing) {
          await trx.from(t('academic_ledger_lines')).where('id', existing.id).update(row)
        } else {
          await trx.table(t('academic_ledger_lines')).insert({
            ...row,
            created_at: new Date(),
          })
        }
        upserted += 1
      }

      await trx
        .from(t('torms_sync_runs'))
        .where('id', syncRun.id)
        .update({
          status: 'completed',
          records_upserted: upserted,
          discrepancy_count: discrepancies,
          finished_at: new Date(),
          updated_at: new Date(),
        })

      await trx.commit()

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: 'torms.sync.grades_ingest',
        entityType: 'torms_sync_run',
        entityId: syncRun.id,
        metadata: {
          studentNumber: input.studentNumber,
          received: input.grades.length,
          upserted,
          discrepancies,
        },
      })

      return {
        syncRunId: syncRun.id as string,
        received: input.grades.length,
        upserted,
        discrepancies,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async pullFromUsis(input: {
    organizationId: string
    studentNumber: string
    actorUserId?: string | null
  }) {
    const exportResult = await usisAcademicClient.exportStudentGrades(
      input.studentNumber,
      input.organizationId
    )

    if (!exportResult.ok) {
      const startedAt = new Date()
      const [syncRun] = await db
        .table(t('torms_sync_runs'))
        .insert({
          organization_id: input.organizationId,
          source: 'usis_pull',
          direction: 'inbound',
          status: 'failed',
          records_received: 0,
          records_upserted: 0,
          discrepancy_count: 0,
          error_summary: exportResult.error,
          started_at: startedAt,
          finished_at: new Date(),
          created_at: startedAt,
        })
        .returning('*')

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: 'torms.sync.usis_pull_failed',
        entityType: 'torms_sync_run',
        entityId: syncRun.id,
        metadata: {
          studentNumber: input.studentNumber,
          unavailable: exportResult.unavailable,
          contract: exportResult.contract,
        },
      })

      return {
        ok: false as const,
        syncRunId: syncRun.id as string,
        error: exportResult.error,
        unavailable: exportResult.unavailable,
        contract: exportResult.contract,
      }
    }

    const gradesRaw = exportResult.data?.data?.grades ?? []
    const grades: LedgerGradeInput[] = gradesRaw
      .filter((g) => {
        const status = String(g.status ?? '')
        return !status || status === 'locked' || status === 'submitted'
      })
      .map((g) => ({
      academicYear: String(g.academicYear ?? g.academic_year ?? ''),
      semester: Number(g.semester ?? 0),
      courseCode: String(g.courseCode ?? g.course_code ?? ''),
      courseTitle: String(g.courseTitle ?? g.course_title ?? ''),
      units: Number(g.units ?? 0),
      grade: g.grade === null || g.grade === undefined ? null : Number(g.grade),
      remarks: (g.remarks as string | null) ?? null,
      sourceEntryId: (g.sourceEntryId as string | null) ?? (g.id as string | null) ?? '',
      originalGrade:
        g.originalGrade === null || g.originalGrade === undefined
          ? null
          : Number(g.originalGrade),
      modifiedGrade:
        g.modifiedGrade === null || g.modifiedGrade === undefined
          ? null
          : Number(g.modifiedGrade),
      programCode: (g.programCode as string | null) ?? null,
    }))
      .filter((grade) => grade.courseCode.length > 0 && grade.academicYear.length > 0)

    const ingest = await this.ingestGrades({
      organizationId: input.organizationId,
      studentNumber: input.studentNumber,
      grades,
      actorUserId: input.actorUserId,
      source: 'usis_pull',
    })

    const student = exportResult.data?.data?.student as
      | { firstName?: string; lastName?: string }
      | undefined
    const studentName = [student?.lastName, student?.firstName].filter(Boolean).join(', ')

    return { ok: true as const, ...ingest, studentName, contract: exportResult.contract }
  }

  async listSyncRuns(organizationId: string, limit = 50) {
    return db
      .from(t('torms_sync_runs'))
      .where('organization_id', organizationId)
      .orderBy('started_at', 'desc')
      .limit(limit)
  }

  async listDiscrepancies(organizationId: string, syncRunId?: string) {
    const q = db.from(t('torms_sync_discrepancies')).where('organization_id', organizationId)
    if (syncRunId) q.where('sync_run_id', syncRunId)
    return q.orderBy('created_at', 'desc').limit(200)
  }
}

export const academicSyncService = new AcademicSyncService()
