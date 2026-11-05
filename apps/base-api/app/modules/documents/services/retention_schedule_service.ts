import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import {
  DispositionAction,
  NapCategory,
  RecordsLifecycleStatus,
} from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import RetentionSchedule from '#modules/documents/models/retention_schedule'
import Document from '#modules/documents/models/document'

export class RetentionScheduleNotFoundException extends Exception {
  static status = 404
  static code = 'E_RETENTION_SCHEDULE_NOT_FOUND'

  constructor(message = 'Retention schedule not found') {
    super(message, { status: 404, code: 'E_RETENTION_SCHEDULE_NOT_FOUND' })
  }
}

const DEFAULT_SCHEDULES: Array<{
  name: string
  code: string
  napCategory: NapCategory
  retentionYears: number
  retentionMonths: number
  dispositionAction: DispositionAction
  description: string
}> = [
  {
    name: 'Administrative records',
    code: 'NAP-ADMIN',
    napCategory: NapCategory.ADMINISTRATIVE,
    retentionYears: 5,
    retentionMonths: 0,
    dispositionAction: DispositionAction.ARCHIVE,
    description: 'NAP GC No. 5 — Administrative records',
  },
  {
    name: 'Financial and property records',
    code: 'NAP-FIN',
    napCategory: NapCategory.FINANCIAL_PROPERTY,
    retentionYears: 10,
    retentionMonths: 0,
    dispositionAction: DispositionAction.ARCHIVE,
    description: 'NAP GC No. 5 — Financial and property records',
  },
  {
    name: 'Legal and contractual records',
    code: 'NAP-LEGAL',
    napCategory: NapCategory.LEGAL_CONTRACTUAL,
    retentionYears: 10,
    retentionMonths: 0,
    dispositionAction: DispositionAction.PERMANENT,
    description: 'NAP GC No. 5 — Legal and contractual records',
  },
  {
    name: 'Academic and instructional records',
    code: 'NAP-ACAD',
    napCategory: NapCategory.ACADEMIC_INSTRUCTIONAL,
    retentionYears: 7,
    retentionMonths: 0,
    dispositionAction: DispositionAction.ARCHIVE,
    description: 'NAP GC No. 5 — Academic and instructional records',
  },
  {
    name: 'Personnel records',
    code: 'NAP-PERS',
    napCategory: NapCategory.PERSONNEL,
    retentionYears: 75,
    retentionMonths: 0,
    dispositionAction: DispositionAction.PERMANENT,
    description: 'NAP GC No. 5 — Personnel records',
  },
  {
    name: 'Student and support records',
    code: 'NAP-STUD',
    napCategory: NapCategory.STUDENT_SUPPORT,
    retentionYears: 5,
    retentionMonths: 0,
    dispositionAction: DispositionAction.DISPOSE,
    description: 'NAP GC No. 5 — Student and support records',
  },
  {
    name: 'Institutional governance records',
    code: 'NAP-GOV',
    napCategory: NapCategory.INSTITUTIONAL_GOVERNANCE,
    retentionYears: 0,
    retentionMonths: 0,
    dispositionAction: DispositionAction.PERMANENT,
    description: 'NAP GC No. 5 — Institutional governance records (permanent)',
  },
]

/** Optional agency packs (COA / CHED) — applied via ensureAgencyPacks. */
const AGENCY_PACK_SCHEDULES: Array<{
  name: string
  code: string
  napCategory: NapCategory
  retentionYears: number
  retentionMonths: number
  dispositionAction: DispositionAction
  description: string
}> = [
  {
    name: 'COA — Disbursement vouchers & supporting docs',
    code: 'COA-DV',
    napCategory: NapCategory.FINANCIAL_PROPERTY,
    retentionYears: 10,
    retentionMonths: 0,
    dispositionAction: DispositionAction.ARCHIVE,
    description: 'COA-aligned financial voucher retention pack',
  },
  {
    name: 'COA — Audit observation & reply files',
    code: 'COA-AOM',
    napCategory: NapCategory.LEGAL_CONTRACTUAL,
    retentionYears: 15,
    retentionMonths: 0,
    dispositionAction: DispositionAction.PERMANENT,
    description: 'COA-aligned audit observation memo pack',
  },
  {
    name: 'CHED — Student permanent academic records',
    code: 'CHED-TOR',
    napCategory: NapCategory.ACADEMIC_INSTRUCTIONAL,
    retentionYears: 0,
    retentionMonths: 0,
    dispositionAction: DispositionAction.PERMANENT,
    description: 'CHED-aligned permanent TOR / academic record pack',
  },
  {
    name: 'CHED — Curriculum & program proposals',
    code: 'CHED-CURR',
    napCategory: NapCategory.ACADEMIC_INSTRUCTIONAL,
    retentionYears: 10,
    retentionMonths: 0,
    dispositionAction: DispositionAction.ARCHIVE,
    description: 'CHED-aligned curriculum submission pack',
  },
  {
    name: 'CHED — Scholarship & grant files',
    code: 'CHED-SCHOL',
    napCategory: NapCategory.STUDENT_SUPPORT,
    retentionYears: 7,
    retentionMonths: 0,
    dispositionAction: DispositionAction.ARCHIVE,
    description: 'CHED-aligned scholarship / grant retention pack',
  },
]

export class RetentionScheduleService {
  async ensureDefaultsForTenant(tenantId: string): Promise<void> {
    for (const schedule of DEFAULT_SCHEDULES) {
      await RetentionSchedule.updateOrCreate(
        { tenantId, code: schedule.code },
        {
          tenantId,
          name: schedule.name,
          code: schedule.code,
          napCategory: schedule.napCategory,
          retentionYears: schedule.retentionYears,
          retentionMonths: schedule.retentionMonths,
          dispositionAction: schedule.dispositionAction,
          description: schedule.description,
          isActive: true,
          isSystem: true,
        }
      )
    }
  }

  /** Install COA / CHED agency pack presets (idempotent). */
  async ensureAgencyPacks(tenantId: string, packs: Array<'coa' | 'ched'> = ['coa', 'ched']): Promise<number> {
    const wanted = AGENCY_PACK_SCHEDULES.filter((s) => {
      if (packs.includes('coa') && s.code.startsWith('COA-')) return true
      if (packs.includes('ched') && s.code.startsWith('CHED-')) return true
      return false
    })

    let upserted = 0
    for (const schedule of wanted) {
      await RetentionSchedule.updateOrCreate(
        { tenantId, code: schedule.code },
        {
          tenantId,
          name: schedule.name,
          code: schedule.code,
          napCategory: schedule.napCategory,
          retentionYears: schedule.retentionYears,
          retentionMonths: schedule.retentionMonths,
          dispositionAction: schedule.dispositionAction,
          description: schedule.description,
          isActive: true,
          isSystem: true,
        }
      )
      upserted += 1
    }
    return upserted
  }

  async list() {
    const tenantId = tenantContext.requireTenantId()
    await this.ensureDefaultsForTenant(tenantId)
    return RetentionSchedule.query()
      .where('tenant_id', tenantId)
      .orderBy('nap_category', 'asc')
      .orderBy('name', 'asc')
  }

  async findByIdOrFail(id: string) {
    const tenantId = tenantContext.requireTenantId()
    const schedule = await RetentionSchedule.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .first()
    if (!schedule) {
      throw new RetentionScheduleNotFoundException()
    }
    return schedule
  }

  async create(input: {
    name: string
    code: string
    napCategory: string
    retentionYears: number
    retentionMonths: number
    dispositionAction: string
    description?: string | null
    isActive?: boolean
  }) {
    const tenantId = tenantContext.requireTenantId()
    return RetentionSchedule.create({
      tenantId,
      name: input.name,
      code: input.code,
      napCategory: input.napCategory,
      retentionYears: input.retentionYears,
      retentionMonths: input.retentionMonths,
      dispositionAction: input.dispositionAction,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
      isSystem: false,
    })
  }

  async update(
    id: string,
    input: Partial<{
      name: string
      code: string
      napCategory: string
      retentionYears: number
      retentionMonths: number
      dispositionAction: string
      description: string | null
      isActive: boolean
    }>
  ) {
    const schedule = await this.findByIdOrFail(id)
    if (input.name !== undefined) schedule.name = input.name
    if (input.code !== undefined) schedule.code = input.code
    if (input.napCategory !== undefined) schedule.napCategory = input.napCategory
    if (input.retentionYears !== undefined) schedule.retentionYears = input.retentionYears
    if (input.retentionMonths !== undefined) schedule.retentionMonths = input.retentionMonths
    if (input.dispositionAction !== undefined) schedule.dispositionAction = input.dispositionAction
    if (input.description !== undefined) schedule.description = input.description
    if (input.isActive !== undefined) schedule.isActive = input.isActive
    await schedule.save()
    return schedule
  }

  async destroy(id: string) {
    const schedule = await this.findByIdOrFail(id)
    if (schedule.isSystem) {
      throw new Exception('System retention schedules cannot be deleted', {
        status: 422,
        code: 'E_RETENTION_SYSTEM_LOCKED',
      })
    }
    await schedule.delete()
  }

  computeRetentionDueAt(
    schedule: Pick<RetentionSchedule, 'retentionYears' | 'retentionMonths' | 'dispositionAction'>,
    baseDate: DateTime
  ): DateTime | null {
    if (schedule.dispositionAction === DispositionAction.PERMANENT) {
      return null
    }
    if (schedule.retentionYears === 0 && schedule.retentionMonths === 0) {
      return null
    }
    return baseDate.plus({ years: schedule.retentionYears, months: schedule.retentionMonths })
  }

  async applyScheduleToDocumentFields(fields: {
    retentionScheduleId?: string | null
    napCategory?: string | null
    documentDate?: DateTime | null
    receivedAt?: DateTime | null
    dispositionAction?: string | null
  }): Promise<{
    retentionScheduleId: string | null
    napCategory: string | null
    retentionDueAt: DateTime | null
    dispositionAction: string | null
    lifecycleStatus?: string
  }> {
    if (!fields.retentionScheduleId) {
      return {
        retentionScheduleId: null,
        napCategory: fields.napCategory ?? null,
        retentionDueAt: null,
        dispositionAction: fields.dispositionAction ?? null,
      }
    }

    const schedule = await this.findByIdOrFail(fields.retentionScheduleId)
    if (fields.napCategory && fields.napCategory !== schedule.napCategory) {
      throw new Exception('NAP category must match the selected retention schedule', {
        status: 422,
        code: 'E_NAP_CATEGORY_MISMATCH',
      })
    }

    const base =
      fields.documentDate ??
      fields.receivedAt ??
      DateTime.now()

    return {
      retentionScheduleId: schedule.id,
      napCategory: schedule.napCategory,
      retentionDueAt: this.computeRetentionDueAt(schedule, base),
      dispositionAction: fields.dispositionAction ?? schedule.dispositionAction,
    }
  }

  serialize(schedule: RetentionSchedule) {
    return {
      id: schedule.id,
      name: schedule.name,
      code: schedule.code,
      napCategory: schedule.napCategory,
      retentionYears: schedule.retentionYears,
      retentionMonths: schedule.retentionMonths,
      dispositionAction: schedule.dispositionAction,
      description: schedule.description,
      isActive: schedule.isActive,
      isSystem: schedule.isSystem,
      createdAt: schedule.createdAt.toISO(),
      updatedAt: schedule.updatedAt?.toISO() ?? null,
    }
  }
}

export const retentionScheduleService = new RetentionScheduleService()

export async function suggestLifecycleForDueDocuments(): Promise<number> {
  const now = DateTime.now()
  const due = await Document.query()
    .whereNull('deleted_at')
    .whereNotNull('retention_due_at')
    .where('retention_due_at', '<=', now.toSQL()!)
    .whereIn('lifecycle_status', [
      RecordsLifecycleStatus.ACTIVE,
      RecordsLifecycleStatus.SEMI_ACTIVE,
    ])
    .limit(500)

  let updated = 0
  for (const document of due) {
    document.lifecycleStatus = RecordsLifecycleStatus.INACTIVE
    await document.save()
    updated += 1
  }
  return updated
}
