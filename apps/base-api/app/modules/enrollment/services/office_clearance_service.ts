import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  CLEARANCE_OFFICES,
  DEFAULT_OFFICE_CLEARANCE_REQUIREMENTS,
  OFFICE_CLEARANCE_ITEM_STATUSES,
  OFFICE_CLEARANCE_TRANSITIONS,
  type ClearanceOffice,
  type OfficeClearanceItemStatus,
} from '#modules/enrollment/domain/office_clearance'
import Student from '#modules/enrollment/models/student'
import StudentDeficiency from '#modules/enrollment/models/student_deficiency'
import { clearanceAggregateService } from '#modules/enrollment/services/clearance_aggregate_service'
import { StudentSupportService } from '#modules/enrollment/services/student_support_service'

function sqlNow() {
  return DateTime.now().toSQL()
}

export class OfficeClearanceService {
  async ensureDefaultRequirements(organizationId: string) {
    for (const row of DEFAULT_OFFICE_CLEARANCE_REQUIREMENTS) {
      const existing = await db
        .from(t('clearance_office_requirements'))
        .where({
          organization_id: organizationId,
          office: row.office,
          requirement_code: row.requirementCode,
        })
        .first()
      if (existing) continue
      await db.table(t('clearance_office_requirements')).insert({
        id: randomUUID(),
        organization_id: organizationId,
        office: row.office,
        requirement_code: row.requirementCode,
        label: row.label,
        auto_source: row.autoSource,
        is_active: true,
        sort_order: row.sortOrder,
        created_at: sqlNow(),
        updated_at: null,
      })
    }
  }

  async listRequirements(organizationId: string, office?: string | null) {
    await this.ensureDefaultRequirements(organizationId)
    const q = db
      .from(t('clearance_office_requirements'))
      .where({ organization_id: organizationId })
      .orderBy('sort_order', 'asc')
      .orderBy('office', 'asc')
    if (office) q.andWhere('office', office)
    const rows = await q
    return rows.map((r) => ({
      id: r.id,
      office: r.office as ClearanceOffice,
      requirementCode: r.requirement_code,
      label: r.label,
      autoSource: r.auto_source,
      isActive: Boolean(r.is_active),
      sortOrder: r.sort_order,
    }))
  }

  async upsertRequirement(input: {
    organizationId: string
    office: ClearanceOffice
    requirementCode: string
    label: string
    autoSource?: string | null
    isActive?: boolean
    sortOrder?: number
  }) {
    if (!(CLEARANCE_OFFICES as readonly string[]).includes(input.office)) {
      throw new EnrollmentWorkflowError('Invalid clearance office', 422, 'INVALID_OFFICE')
    }
    await this.ensureDefaultRequirements(input.organizationId)
    const code = input.requirementCode.trim().toUpperCase()
    const existing = await db
      .from(t('clearance_office_requirements'))
      .where({
        organization_id: input.organizationId,
        office: input.office,
        requirement_code: code,
      })
      .first()
    if (existing) {
      await db
        .from(t('clearance_office_requirements'))
        .where({ id: existing.id })
        .update({
          label: input.label.trim(),
          auto_source: input.autoSource ?? existing.auto_source,
          is_active: input.isActive ?? existing.is_active,
          sort_order: input.sortOrder ?? existing.sort_order,
          updated_at: sqlNow(),
        })
      return existing.id as string
    }
    const id = randomUUID()
    await db.table(t('clearance_office_requirements')).insert({
      id,
      organization_id: input.organizationId,
      office: input.office,
      requirement_code: code,
      label: input.label.trim(),
      auto_source: input.autoSource ?? null,
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 100,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async syncStudentOfficeClearance(input: {
    organizationId: string
    studentId: string
    actorUserId?: string | null
  }) {
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    await this.ensureDefaultRequirements(input.organizationId)
    const requirements = await db
      .from(t('clearance_office_requirements'))
      .where({ organization_id: input.organizationId, is_active: true })
      .orderBy('sort_order', 'asc')

    const cross = await clearanceAggregateService.crossSystemChecks(
      student.studentNumber,
      input.organizationId
    )
    const sss = await new StudentSupportService().crossOfficeClearanceCheck(
      input.organizationId,
      input.studentId
    )
    const openAcademic = await StudentDeficiency.query()
      .where({ organization_id: input.organizationId, student_id: input.studentId })
      .whereNull('deleted_at')
      .whereIn('status', ['open', 'submitted', 'rejected'])

    const derived: Record<string, { status: OfficeClearanceItemStatus; sourceRef: string }> = {
      student_deficiencies: {
        status: openAcademic.length === 0 ? 'cleared' : 'deficient',
        sourceRef: `open_deficiencies:${openAcademic.length}`,
      },
      finance_internal: {
        status: cross.finance.cleared ? 'cleared' : 'deficient',
        sourceRef: cross.finance.error ? 'finance:error' : `finance:open:${cross.finance.openItems ?? 0}`,
      },
      library_internal: {
        status: cross.library.cleared ? 'cleared' : 'deficient',
        sourceRef: cross.library.error ? 'library:error' : `library:open:${cross.library.openItems ?? 0}`,
      },
      inventory_internal: {
        status: cross.inventory.cleared ? 'cleared' : 'deficient',
        sourceRef: cross.inventory.error
          ? 'inventory:error'
          : `inventory:open:${cross.inventory.openItems ?? 0}`,
      },
      sss_guidance: {
        status: sss.offices.guidance.cleared ? 'cleared' : 'deficient',
        sourceRef: sss.offices.guidance.pendingCounselingCases ? 'guidance:pending' : 'guidance:ok',
      },
      sss_health: {
        status: sss.offices.health.cleared ? 'cleared' : 'deficient',
        sourceRef: `health:${sss.offices.health.clearanceStatus}`,
      },
      sss_osa: {
        status: sss.offices.osa.cleared ? 'cleared' : 'deficient',
        sourceRef: sss.offices.osa.openDisciplinaryCases ? 'osa:open_case' : 'osa:ok',
      },
    }

    const items = []
    for (const req of requirements) {
      const auto = req.auto_source ? derived[req.auto_source as string] : null
      const status = auto?.status ?? 'pending'
      const sourceRef = auto?.sourceRef ?? null
      const existing = await db
        .from(t('student_office_clearance_items'))
        .where({
          organization_id: input.organizationId,
          student_id: input.studentId,
          requirement_id: req.id,
        })
        .first()

      if (existing) {
        const patch: Record<string, unknown> = {
          office: req.office,
          requirement_code: req.requirement_code,
          updated_at: sqlNow(),
          updated_by: input.actorUserId ?? existing.updated_by,
        }
        if (auto) {
          patch.status = status
          patch.auto_synced = true
          patch.source_ref = sourceRef
          patch.cleared_at = status === 'cleared' ? sqlNow() : null
        }
        await db.from(t('student_office_clearance_items')).where({ id: existing.id }).update(patch)
        items.push(existing.id)
      } else {
        const id = randomUUID()
        await db.table(t('student_office_clearance_items')).insert({
          id,
          organization_id: input.organizationId,
          student_id: input.studentId,
          requirement_id: req.id,
          office: req.office,
          requirement_code: req.requirement_code,
          status,
          auto_synced: Boolean(auto),
          source_ref: sourceRef,
          notes: null,
          updated_by: input.actorUserId ?? null,
          cleared_at: status === 'cleared' ? sqlNow() : null,
          created_at: sqlNow(),
          updated_at: null,
        })
        items.push(id)
      }
    }

    return this.getStudentOfficeClearance(input.organizationId, input.studentId)
  }

  async getStudentOfficeClearance(organizationId: string, studentId: string) {
    await this.ensureDefaultRequirements(organizationId)
    const student = await Student.find(studentId)
    if (!student || student.organizationId !== organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    const rows = await db
      .from(`${t('student_office_clearance_items')} as i`)
      .leftJoin(`${t('clearance_office_requirements')} as r`, 'r.id', 'i.requirement_id')
      .where('i.organization_id', organizationId)
      .where('i.student_id', studentId)
      .select(
        'i.id',
        'i.office',
        'i.requirement_code',
        'i.status',
        'i.auto_synced',
        'i.source_ref',
        'i.notes',
        'i.cleared_at',
        'i.updated_at',
        'r.label',
        'r.auto_source',
        'r.sort_order'
      )
      .orderBy('r.sort_order', 'asc')

    const byOffice: Record<
      string,
      {
        office: string
        cleared: boolean
        items: Array<Record<string, unknown>>
      }
    > = {}
    for (const office of CLEARANCE_OFFICES) {
      byOffice[office] = { office, cleared: true, items: [] }
    }
    for (const row of rows) {
      const office = String(row.office)
      if (!byOffice[office]) byOffice[office] = { office, cleared: true, items: [] }
      const item = {
        id: row.id,
        requirementCode: row.requirement_code,
        label: row.label ?? row.requirement_code,
        status: row.status,
        autoSynced: Boolean(row.auto_synced),
        sourceRef: row.source_ref,
        notes: row.notes,
        clearedAt: row.cleared_at,
        autoSource: row.auto_source,
      }
      byOffice[office].items.push(item)
      if (!['cleared', 'waived'].includes(String(row.status))) {
        byOffice[office].cleared = false
      }
    }

    const offices = CLEARANCE_OFFICES.map((o) => byOffice[o]).filter((o) => (o?.items.length ?? 0) > 0)
    const holdOffices = offices.filter((o) => !o.cleared).map((o) => o.office)
    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: `${student.lastName}, ${student.firstName}`,
      },
      overallCleared: holdOffices.length === 0 && offices.length > 0,
      holdOffices,
      offices,
      note: 'ENR-024 per-office clearance. Auto-sources draw from finance/library/inventory + SSS/academic signals. Enrollment hard-block gate remains [CONFIRM].',
    }
  }

  async advanceItem(input: {
    organizationId: string
    itemId: string
    status: OfficeClearanceItemStatus
    notes?: string | null
    actorUserId: string
  }) {
    if (!(OFFICE_CLEARANCE_ITEM_STATUSES as readonly string[]).includes(input.status)) {
      throw new EnrollmentWorkflowError('Invalid clearance item status', 422, 'INVALID_STATUS')
    }
    const row = await db
      .from(t('student_office_clearance_items'))
      .where({ id: input.itemId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Clearance item not found', 404, 'NOT_FOUND')
    const allowed = OFFICE_CLEARANCE_TRANSITIONS[row.status] ?? []
    if (!allowed.includes(input.status)) {
      throw new EnrollmentWorkflowError(
        `Cannot transition ${row.status} → ${input.status}`,
        422,
        'INVALID_TRANSITION'
      )
    }
    await db
      .from(t('student_office_clearance_items'))
      .where({ id: input.itemId })
      .update({
        status: input.status,
        notes: input.notes ?? row.notes,
        auto_synced: false,
        updated_by: input.actorUserId,
        cleared_at: ['cleared', 'waived'].includes(input.status) ? sqlNow() : null,
        updated_at: sqlNow(),
      })
    return this.getStudentOfficeClearance(input.organizationId, row.student_id)
  }
}

export const officeClearanceService = new OfficeClearanceService()
