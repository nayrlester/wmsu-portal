import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import Student from '#modules/enrollment/models/student'
import StudentDeficiency from '#modules/enrollment/models/student_deficiency'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

const ACTIVE_BLOCKING = ['open', 'submitted', 'rejected'] as const
const MUTABLE = ['open', 'submitted', 'rejected', 'approved', 'cleared'] as const

function badRequest(message: string) {
  return new Exception(message, { status: 422, code: 'E_VALIDATION_FAILURE' })
}

export class StudentRequirementsService {
  async list(organizationId: string, filters?: { studentId?: string; status?: string }) {
    const query = StudentDeficiency.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .preload('student')
      .orderBy('created_at', 'desc')
    if (filters?.studentId) query.where('student_id', filters.studentId)
    if (filters?.status) query.where('status', filters.status)
    return query
  }

  async create(
    organizationId: string,
    data: { studentId: string; requirementCode: string; description: string },
    actorUserId: string
  ) {
    await Student.query()
      .where('organization_id', organizationId)
      .where('id', data.studentId)
      .firstOrFail()

    const row = await StudentDeficiency.create({
      organizationId,
      studentId: data.studentId,
      requirementCode: data.requirementCode.trim().toUpperCase(),
      description: data.description.trim(),
      status: 'open',
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      clearedAt: null,
      deletedAt: null,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'student_deficiency',
      entityId: row.id,
    })
    return row
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{ requirementCode: string; description: string; status: string }>,
    actorUserId: string
  ) {
    const row = await this.findActive(organizationId, id)
    if (data.requirementCode !== undefined) row.requirementCode = data.requirementCode.trim().toUpperCase()
    if (data.description !== undefined) row.description = data.description.trim()
    if (data.status !== undefined) {
      if (!(MUTABLE as readonly string[]).includes(data.status)) {
        throw badRequest('Invalid requirement status')
      }
      row.status = data.status
      if (data.status === 'cleared' || data.status === 'approved') {
        row.clearedAt = row.clearedAt ?? DateTime.now()
      }
    }
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_deficiency',
      entityId: row.id,
    })
    return row
  }

  async softDelete(organizationId: string, id: string, actorUserId: string) {
    const row = await this.findActive(organizationId, id)
    row.deletedAt = DateTime.now()
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'student_deficiency',
      entityId: row.id,
    })
    return row
  }

  async submit(organizationId: string, id: string, actorUserId: string, notes?: string | null) {
    const row = await this.findActive(organizationId, id)
    if (!['open', 'rejected'].includes(row.status)) {
      throw badRequest('Only open or rejected requirements can be submitted')
    }
    row.status = 'submitted'
    row.reviewNotes = notes?.trim() || row.reviewNotes
    row.reviewedBy = null
    row.reviewedAt = null
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_deficiency',
      entityId: row.id,
      metadata: { status: 'submitted' },
    })
    return row
  }

  async approve(organizationId: string, id: string, actorUserId: string, notes?: string | null) {
    const row = await this.findActive(organizationId, id)
    if (!['open', 'submitted', 'rejected'].includes(row.status)) {
      throw badRequest('Requirement cannot be approved from its current status')
    }
    row.status = 'approved'
    row.clearedAt = DateTime.now()
    row.reviewedBy = actorUserId
    row.reviewedAt = DateTime.now()
    row.reviewNotes = notes?.trim() || row.reviewNotes
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_deficiency',
      entityId: row.id,
      metadata: { status: 'approved' },
    })
    return row
  }

  async reject(organizationId: string, id: string, actorUserId: string, notes?: string | null) {
    const row = await this.findActive(organizationId, id)
    if (!['open', 'submitted'].includes(row.status)) {
      throw badRequest('Only open or submitted requirements can be rejected')
    }
    row.status = 'rejected'
    row.clearedAt = null
    row.reviewedBy = actorUserId
    row.reviewedAt = DateTime.now()
    row.reviewNotes = notes?.trim() || 'Rejected'
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_deficiency',
      entityId: row.id,
      metadata: { status: 'rejected' },
    })
    return row
  }

  async clear(organizationId: string, id: string, actorUserId: string) {
    const row = await this.findActive(organizationId, id)
    row.status = 'cleared'
    row.clearedAt = DateTime.now()
    row.reviewedBy = actorUserId
    row.reviewedAt = DateTime.now()
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'student_deficiency',
      entityId: row.id,
      metadata: { status: 'cleared' },
    })
    return row
  }

  async complianceReport(organizationId: string) {
    const statusRows = await db
      .from(t('student_deficiencies'))
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .groupBy('status')
      .select('status')
      .count('* as total')

    const byCode = await db
      .from(t('student_deficiencies'))
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .whereIn('status', [...ACTIVE_BLOCKING])
      .groupBy('requirement_code')
      .select('requirement_code')
      .count('* as total')
      .orderBy('total', 'desc')

    const nonCompliantStudents = await db
      .from(t('student_deficiencies as d'))
      .join(t('students as s'), 's.id', 'd.student_id')
      .where('d.organization_id', organizationId)
      .whereNull('d.deleted_at')
      .whereIn('d.status', [...ACTIVE_BLOCKING])
      .groupBy('s.id', 's.student_number', 's.first_name', 's.last_name', 's.email')
      .select(
        's.id as student_id',
        's.student_number',
        's.first_name',
        's.last_name',
        's.email'
      )
      .count('* as open_count')
      .orderBy('open_count', 'desc')
      .limit(200)

    const statusCounts: Record<string, number> = {}
    for (const row of statusRows) {
      statusCounts[String(row.status)] = Number(row.total ?? 0)
    }

    return {
      generatedAt: DateTime.now().toISO(),
      statusCounts,
      openByRequirementCode: byCode.map((r) => ({
        requirementCode: String(r.requirement_code),
        total: Number(r.total ?? 0),
      })),
      nonCompliantStudents: nonCompliantStudents.map((r) => ({
        studentId: String(r.student_id),
        studentNumber: String(r.student_number),
        name: `${r.last_name}, ${r.first_name}`,
        email: String(r.email),
        openCount: Number(r.open_count ?? 0),
      })),
      blockingStatuses: [...ACTIVE_BLOCKING],
    }
  }

  private async findActive(organizationId: string, id: string) {
    return StudentDeficiency.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .whereNull('deleted_at')
      .firstOrFail()
  }
}

export const studentRequirementsService = new StudentRequirementsService()
