import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { RecordsLifecycleStatus } from '#modules/documents/domain/enums/index'

export type InventoryFilters = {
  officeId?: string
  napCategory?: string
  lifecycleStatus?: string
  year?: number
  dueForArchive?: boolean
  dueWithinDays?: number
  page?: number
  limit?: number
}

export class RecordsInventoryService {
  async list(filters: InventoryFilters) {
    const tenantId = tenantContext.requireTenantId()
    const page = Math.max(filters.page ?? 1, 1)
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)

    const query = Document.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('department')
      .preload('originatingOffice')
      .preload('receivingOffice')
      .preload('retentionSchedule')
      .orderBy('created_at', 'desc')

    if (filters.officeId) {
      query.where((q) => {
        q.where('department_id', filters.officeId!)
          .orWhere('originating_office_id', filters.officeId!)
          .orWhere('receiving_office_id', filters.officeId!)
      })
    }
    if (filters.napCategory) query.where('nap_category', filters.napCategory)
    if (filters.lifecycleStatus) query.where('lifecycle_status', filters.lifecycleStatus)
    if (filters.year) {
      query.whereRaw(`extract(year from coalesce(document_date, created_at)) = ?`, [filters.year])
    }
    if (filters.dueForArchive) {
      const now = DateTime.now().toSQL()!
      query.whereNotNull('retention_due_at').where('retention_due_at', '<=', now)
    } else if (filters.dueWithinDays) {
      const until = DateTime.now().plus({ days: filters.dueWithinDays }).toSQL()!
      const now = DateTime.now().toSQL()!
      query
        .whereNotNull('retention_due_at')
        .where('retention_due_at', '>=', now)
        .where('retention_due_at', '<=', until)
    }

    return query.paginate(page, limit)
  }

  async summary() {
    const tenantId = tenantContext.requireTenantId()
    const now = DateTime.now()
    const soon = now.plus({ days: 30 })

    const [dueArchive, approaching, byLifecycle, byNap] = await Promise.all([
      Document.query()
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .whereNotNull('retention_due_at')
        .where('retention_due_at', '<=', now.toSQL()!)
        .count('* as total')
        .first(),
      Document.query()
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .whereNotNull('retention_due_at')
        .where('retention_due_at', '>', now.toSQL()!)
        .where('retention_due_at', '<=', soon.toSQL()!)
        .count('* as total')
        .first(),
      Document.query()
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .groupBy('lifecycle_status')
        .select('lifecycle_status')
        .count('* as total'),
      Document.query()
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .whereNotNull('nap_category')
        .groupBy('nap_category')
        .select('nap_category')
        .count('* as total'),
    ])

    return {
      dueForArchival: Number(dueArchive?.$extras.total ?? 0),
      approachingRetention: Number(approaching?.$extras.total ?? 0),
      byLifecycle: byLifecycle.reduce<Record<string, number>>((acc, row) => {
        acc[row.lifecycleStatus || RecordsLifecycleStatus.ACTIVE] = Number(row.$extras.total ?? 0)
        return acc
      }, {}),
      byNapCategory: byNap.reduce<Record<string, number>>((acc, row) => {
        if (row.napCategory) acc[row.napCategory] = Number(row.$extras.total ?? 0)
        return acc
      }, {}),
    }
  }

  toCsv(rows: Document[]): string {
    const header = [
      'tracking_number',
      'title',
      'office',
      'nap_category',
      'lifecycle_status',
      'confidentiality',
      'document_date',
      'received_at',
      'retention_due_at',
      'disposition_action',
      'year',
    ]
    const lines = [header.join(',')]
    for (const doc of rows) {
      const office =
        doc.receivingOffice?.name ??
        doc.department?.name ??
        doc.originatingOffice?.name ??
        ''
      const year = (doc.documentDate ?? doc.createdAt).year
      const values = [
        doc.trackingNumber,
        doc.title,
        office,
        doc.napCategory ?? '',
        doc.lifecycleStatus,
        doc.confidentiality,
        doc.documentDate?.toISODate() ?? '',
        doc.receivedAt?.toISO() ?? '',
        doc.retentionDueAt?.toISO() ?? '',
        doc.dispositionAction ?? '',
        String(year),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
      lines.push(values.join(','))
    }
    return lines.join('\n')
  }

  serializeRow(doc: Document) {
    return {
      id: doc.id,
      trackingNumber: doc.trackingNumber,
      title: doc.title,
      napCategory: doc.napCategory,
      lifecycleStatus: doc.lifecycleStatus,
      confidentiality: doc.confidentiality,
      documentDate: doc.documentDate?.toISODate() ?? null,
      receivedAt: doc.receivedAt?.toISO() ?? null,
      retentionDueAt: doc.retentionDueAt?.toISO() ?? null,
      dispositionAction: doc.dispositionAction,
      department: doc.department
        ? { id: doc.department.id, name: doc.department.name }
        : null,
      originatingOffice: doc.originatingOffice
        ? { id: doc.originatingOffice.id, name: doc.originatingOffice.name }
        : null,
      receivingOffice: doc.receivingOffice
        ? { id: doc.receivingOffice.id, name: doc.receivingOffice.name }
        : null,
      retentionSchedule: doc.retentionSchedule
        ? {
            id: doc.retentionSchedule.id,
            name: doc.retentionSchedule.name,
            code: doc.retentionSchedule.code,
          }
        : null,
    }
  }
}

export const recordsInventoryService = new RecordsInventoryService()
