import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import Program from '#modules/enrollment/models/program'
import Student from '#modules/enrollment/models/student'
import UsisStudentImportBatch from '#modules/enrollment/models/usis_student_import_batch'
import UsisStudentImportRejection from '#modules/enrollment/models/usis_student_import_rejection'
import UsisStudentImportAccepted from '#modules/enrollment/models/usis_student_import_accepted'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export type StudentImportRow = {
  studentNumber?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  email?: string | null
  mobile?: string | null
  programCode?: string | null
  classification?: string | null
  yearLevel?: number | string | null
  status?: string | null
}

function badRequest(message: string) {
  return new Exception(message, { status: 422, code: 'E_VALIDATION_FAILURE' })
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export class StudentImportService {
  async listBatches(organizationId: string) {
    return UsisStudentImportBatch.query()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
  }

  async getBatch(organizationId: string, batchId: string) {
    const batch = await UsisStudentImportBatch.query()
      .where('organization_id', organizationId)
      .where('id', batchId)
      .firstOrFail()

    const [rejections, accepted] = await Promise.all([
      UsisStudentImportRejection.query()
        .where('batch_id', batchId)
        .orderBy('row_number', 'asc'),
      UsisStudentImportAccepted.query().where('batch_id', batchId).orderBy('row_number', 'asc'),
    ])

    return { batch, rejections, accepted }
  }

  async importRows(
    organizationId: string,
    input: { sourceName?: string; rows: StudentImportRow[] },
    actorUserId: string
  ) {
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      throw badRequest('rows must be a non-empty array')
    }
    if (input.rows.length > 500) {
      throw badRequest('A maximum of 500 rows can be imported per batch')
    }

    const batch = await UsisStudentImportBatch.create({
      organizationId,
      sourceName: (input.sourceName || 'manual').trim().slice(0, 255) || 'manual',
      status: 'processing',
      totalRows: input.rows.length,
      acceptedCount: 0,
      rejectedCount: 0,
      createdBy: actorUserId,
      completedAt: null,
    })

    const seenEmails = new Set<string>()
    const seenNumbers = new Set<string>()
    let acceptedCount = 0
    let rejectedCount = 0

    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i] ?? {}
      const rowNumber = i + 1
      const payload = { ...row } as Record<string, unknown>
      const firstName = String(row.firstName ?? '').trim()
      const lastName = String(row.lastName ?? '').trim()
      const email = String(row.email ?? '').trim().toLowerCase()
      const studentNumberRaw = String(row.studentNumber ?? '').trim()
      const middleName = String(row.middleName ?? '').trim() || null
      const mobile = String(row.mobile ?? '').trim() || null
      const programCode = String(row.programCode ?? '').trim().toUpperCase() || null
      const classification = String(row.classification ?? '').trim() || null
      const status = String(row.status ?? 'active').trim() || 'active'
      const yearLevelRaw = row.yearLevel
      const yearLevel =
        yearLevelRaw === null || yearLevelRaw === undefined || yearLevelRaw === ''
          ? null
          : Number(yearLevelRaw)

      const reject = async (reason: string) => {
        rejectedCount += 1
        await UsisStudentImportRejection.create({
          organizationId,
          batchId: batch.id,
          rowNumber,
          payload,
          reason,
        })
      }

      if (!firstName || !lastName || !email) {
        await reject('firstName, lastName, and email are required')
        continue
      }
      if (!isEmail(email)) {
        await reject('email format is invalid')
        continue
      }
      if (seenEmails.has(email)) {
        await reject('duplicate email within the same import batch')
        continue
      }
      if (yearLevel != null && (!Number.isFinite(yearLevel) || yearLevel < 1 || yearLevel > 12)) {
        await reject('yearLevel must be an integer from 1 to 12 when provided')
        continue
      }

      const existingEmail = await Student.query()
        .where('organization_id', organizationId)
        .whereRaw('LOWER(email) = ?', [email])
        .first()
      if (existingEmail) {
        await reject(`email already exists (${existingEmail.studentNumber})`)
        continue
      }

      let programId: string | null = null
      if (programCode) {
        const program = await Program.query()
          .where('organization_id', organizationId)
          .whereILike('code', programCode)
          .first()
        if (!program) {
          await reject(`unknown programCode: ${programCode}`)
          continue
        }
        programId = program.id
      }

      let studentNumber = studentNumberRaw
      if (studentNumber) {
        if (seenNumbers.has(studentNumber.toUpperCase())) {
          await reject('duplicate studentNumber within the same import batch')
          continue
        }
        const existingNumber = await Student.query()
          .where('organization_id', organizationId)
          .where('student_number', studentNumber)
          .first()
        if (existingNumber) {
          await reject(`studentNumber already exists: ${studentNumber}`)
          continue
        }
      } else {
        studentNumber = `STU-IMP-${Date.now().toString(36).toUpperCase()}-${rowNumber}`
      }

      try {
        const student = await Student.create({
          organizationId,
          studentNumber,
          applicantId: null,
          firstName,
          middleName,
          lastName,
          email,
          mobile,
          birthDate: null,
          programId,
          status,
          classification,
          mdmCampusId: null,
          yearLevel: yearLevel == null ? null : Math.trunc(yearLevel),
          platformUserId: null,
        })

        await UsisStudentImportAccepted.create({
          organizationId,
          batchId: batch.id,
          rowNumber,
          studentId: student.id,
          studentNumber: student.studentNumber,
        })
        acceptedCount += 1
        seenEmails.add(email)
        seenNumbers.add(student.studentNumber.toUpperCase())
      } catch (err) {
        await reject(err instanceof Error ? err.message : 'Failed to create student profile')
      }
    }

    batch.status = 'completed'
    batch.acceptedCount = acceptedCount
    batch.rejectedCount = rejectedCount
    batch.completedAt = DateTime.now()
    await batch.save()

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_student_import_batch',
      entityId: batch.id,
      metadata: { acceptedCount, rejectedCount, totalRows: input.rows.length },
    })

    return this.getBatch(organizationId, batch.id)
  }
}

export const studentImportService = new StudentImportService()
