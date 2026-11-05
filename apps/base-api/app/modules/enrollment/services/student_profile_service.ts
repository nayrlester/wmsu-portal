import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import Student from '#modules/enrollment/models/student'
import AttendanceRecord from '#modules/enrollment/models/attendance_record'
import GwaSnapshot from '#modules/enrollment/models/gwa_snapshot'
import UsisStudentProfileViolation from '#modules/enrollment/models/usis_student_profile_violation'
import { GradeRecordsService } from '#modules/enrollment/services/grade_records_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'
import { t } from '#modules/enrollment/helpers/db_schema'

function badRequest(message: string) {
  return new Exception(message, { status: 422, code: 'E_VALIDATION_FAILURE' })
}

const VIOLATION_STATUSES = ['recorded', 'cleared', 'appealed'] as const

export class StudentProfileService {
  private grades = new GradeRecordsService()

  async getProfile(organizationId: string, studentId: string) {
    const student = await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .whereNull('deleted_at')
      .preload('program')
      .firstOrFail()

    const academic = await this.grades.academicRecordsForStudent(organizationId, studentId)
    const absences = await this.listAbsences(organizationId, studentId)
    const violations = await this.listViolations(organizationId, studentId)
    const osaSanctions = await db
      .from(t('discipline_sanctions'))
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('created_at', 'desc')
      .limit(50)

    const gwaRows = await GwaSnapshot.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('as_of', 'desc')
      .limit(5)

    const absenceSummary = {
      total: absences.length,
      absent: absences.filter((a) => a.status === 'absent').length,
      late: absences.filter((a) => a.status === 'late').length,
      excused: absences.filter((a) => a.status === 'excused').length,
      present: absences.filter((a) => a.status === 'present').length,
    }

    const latestStanding = gwaRows[0]?.academicStanding ?? null
    const latestGwa = gwaRows[0]
      ? {
          termGwa: gwaRows[0].termGwa !== null ? Number(gwaRows[0].termGwa) : null,
          cumulativeGwa: gwaRows[0].cumulativeGwa !== null ? Number(gwaRows[0].cumulativeGwa) : null,
          unitsEarned: Number(gwaRows[0].unitsEarned),
          unitsGraded: Number(gwaRows[0].unitsGraded),
          academicStanding: gwaRows[0].academicStanding,
          asOf: gwaRows[0].asOf?.toISO() ?? null,
        }
      : academic.gwa
        ? {
            termGwa: academic.gwa.termGwa !== null ? Number(academic.gwa.termGwa) : null,
            cumulativeGwa:
              academic.gwa.cumulativeGwa !== null ? Number(academic.gwa.cumulativeGwa) : null,
            unitsEarned: Number(academic.gwa.unitsEarned),
            unitsGraded: Number(academic.gwa.unitsGraded),
            academicStanding: academic.gwa.academicStanding,
            asOf: academic.gwa.asOf?.toISO?.() ?? null,
          }
        : null

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        email: student.email,
        mobile: student.mobile,
        birthDate: student.birthDate?.toISODate?.() ?? null,
        status: student.status,
        classification: student.classification,
        yearLevel: student.yearLevel,
        mdmCampusId: student.mdmCampusId,
        programId: student.programId,
        programCode: student.program?.code ?? null,
        programName: student.program?.name ?? null,
      },
      performance: {
        gradeCount: academic.grades.length,
        grades: academic.grades,
        gwa: latestGwa,
        academicStanding: latestStanding ?? latestGwa?.academicStanding ?? null,
        gwaHistory: gwaRows.map((g) => ({
          id: g.id,
          termGwa: g.termGwa !== null ? Number(g.termGwa) : null,
          cumulativeGwa: g.cumulativeGwa !== null ? Number(g.cumulativeGwa) : null,
          academicStanding: g.academicStanding,
          asOf: g.asOf?.toISO() ?? null,
        })),
      },
      absences: {
        summary: absenceSummary,
        records: absences,
      },
      violations: {
        academic: violations,
        osaSanctions: osaSanctions.map((s) => ({
          id: String(s.id),
          sanctionCode: String(s.sanction_code),
          label: String(s.label),
          effectiveFrom: s.effective_from ? String(s.effective_from) : null,
          effectiveTo: s.effective_to ? String(s.effective_to) : null,
          createdAt: s.created_at ? String(s.created_at) : null,
        })),
      },
      transcriptNote:
        'Official transcript ledger remains TORMS. This profile exposes operational USiS grades and approved sync payloads only.',
      generatedAt: DateTime.now().toISO(),
    }
  }

  async listAbsences(organizationId: string, studentId: string) {
    await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .whereNull('deleted_at')
      .firstOrFail()

    const rows = await AttendanceRecord.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('session_date', 'desc')
      .limit(200)

    return rows.map((r) => ({
      id: r.id,
      classRecordId: r.classRecordId,
      sessionDate: r.sessionDate?.toISODate?.() ?? String(r.sessionDate),
      status: r.status,
      notes: r.notes,
    }))
  }

  async listViolations(organizationId: string, studentId: string) {
    const rows = await UsisStudentProfileViolation.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('created_at', 'desc')
      .limit(100)
    return rows.map((r) => this.serializeViolation(r))
  }

  async recordViolation(
    organizationId: string,
    studentId: string,
    input: {
      violationCode: string
      title: string
      description?: string | null
      status?: string
      occurredAt?: string | null
    },
    actorUserId: string
  ) {
    await Student.query()
      .where('organization_id', organizationId)
      .where('id', studentId)
      .whereNull('deleted_at')
      .firstOrFail()

    const status = input.status ?? 'recorded'
    if (!(VIOLATION_STATUSES as readonly string[]).includes(status)) {
      throw badRequest('Invalid violation status')
    }

    const row = await UsisStudentProfileViolation.create({
      organizationId,
      studentId,
      violationCode: input.violationCode.trim().toUpperCase(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status,
      occurredAt: input.occurredAt ? DateTime.fromISO(input.occurredAt) : DateTime.now(),
      recordedBy: actorUserId,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'student_profile_violation',
      entityId: row.id,
    })
    return this.serializeViolation(row)
  }

  async updateViolation(
    organizationId: string,
    violationId: string,
    input: Partial<{ status: string; title: string; description: string | null }>,
    actorUserId: string
  ) {
    const row = await UsisStudentProfileViolation.query()
      .where('organization_id', organizationId)
      .where('id', violationId)
      .firstOrFail()
    if (input.status !== undefined) {
      if (!(VIOLATION_STATUSES as readonly string[]).includes(input.status)) {
        throw badRequest('Invalid violation status')
      }
      row.status = input.status
    }
    if (input.title !== undefined) row.title = input.title.trim()
    if (input.description !== undefined) row.description = input.description
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_profile_violation',
      entityId: row.id,
    })
    return this.serializeViolation(row)
  }

  private serializeViolation(row: UsisStudentProfileViolation) {
    return {
      id: row.id,
      studentId: row.studentId,
      violationCode: row.violationCode,
      title: row.title,
      description: row.description,
      status: row.status,
      occurredAt: row.occurredAt?.toISO() ?? null,
      recordedBy: row.recordedBy,
      createdAt: row.createdAt?.toISO() ?? null,
    }
  }
}

export const studentProfileService = new StudentProfileService()
