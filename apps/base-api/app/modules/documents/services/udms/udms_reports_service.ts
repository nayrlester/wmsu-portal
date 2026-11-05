import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import Document from '#modules/documents/models/document'
import RoutingEntry from '#modules/documents/models/routing_entry'
import Approval from '#modules/documents/models/approval'
import AuditLog from '#modules/documents/models/audit_log'
import RecordRequest from '#modules/documents/models/record_request'
import { DocumentStatus, RecordsLifecycleStatus } from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import User from '#modules/documents/models/user'

export class UdmsReportsValidationException extends Exception {
  constructor(message: string) {
    super(message, { status: 422, code: 'E_UDMS_REPORTS_VALIDATION' })
  }
}

export type UdmsReportFilters = {
  from?: string
  to?: string
  officeId?: string
  documentTypeId?: string
  napCategory?: string
  status?: string
  lifecycleStatus?: string
  page?: number
  limit?: number
}

const METRIC_DEFINITIONS = {
  totalDocuments:
    'Count of non-deleted documents in the tenant matching the active filters (source: documents)',
  registeredInPeriod:
    'Count of documents whose created_at falls within [from, to] inclusive (source: documents.created_at)',
  byStatus: 'Group count by documents.status (source: documents)',
  byNapCategory: 'Group count by documents.nap_category where not null (source: documents)',
  byOffice:
    'Group count by department_id / originating_office_id / receiving_office_id as selected (source: documents)',
  currentlyAssigned: 'Count where assigned_to_id is not null (source: documents)',
  awaitingActionStatuses:
    'Count where status in submitted/received/pending_review/pending_approval (source: documents) — not an SLA overdue metric',
  archivedDocuments:
    'Count where status=archived OR lifecycle_status=archived (source: documents)',
  withRetentionSchedule: 'Count where retention_schedule_id is not null (source: documents)',
  retentionDue:
    'Count where retention_due_at is not null and <= now (source: documents) — uses configured due dates only',
  routingEventsInPeriod:
    'Count of routing_entries.routed_at within period (source: routing_entries)',
  approvalActionsInPeriod: 'Count of approvals.acted_at within period (source: approvals)',
  averageElapsedHoursSubmitToComplete:
    'Mean hours between submitted_at and completed_at for completed documents in period; null when fewer than 1 sample — descriptive elapsed time only, not an SLA target',
  recordRequestsVolume: 'Count of record_requests created in period (source: record_requests)',
  auditActionsInPeriod: 'Count of audit_logs created_at in period for document entities (source: audit_logs)',
}

export class UdmsReportsService {
  async getDashboard(user: User, filters: UdmsReportFilters) {
    this.assertViewer(user)
    const { from, to } = this.parseRange(filters)
    const tenantId = tenantContext.requireTenantId()

    const base = this.documentsBase(tenantId, filters)
    const periodBase = this.documentsBase(tenantId, filters).whereBetween('created_at', [
      from.toSQL()!,
      to.toSQL()!,
    ])

    const [
      totalRow,
      periodRow,
      assignedRow,
      awaitingRow,
      archivedRow,
      withScheduleRow,
      retentionDueRow,
      byStatus,
      byNap,
      byDept,
      routingCount,
      approvalCount,
      elapsed,
      recordReqCount,
      pendingRecordReqCount,
      avgRecordRequestHours,
      volumeByStaff,
      receivedByOffice,
      originatingByOffice,
      releasedInPeriod,
      auditCount,
      registrationTrend,
      recentActivity,
    ] = await Promise.all([
      base.clone().count('* as total').first(),
      periodBase.clone().count('* as total').first(),
      base.clone().whereNotNull('assigned_to_id').count('* as total').first(),
      base
        .clone()
        .whereIn('status', [
          DocumentStatus.SUBMITTED,
          DocumentStatus.RECEIVED,
          DocumentStatus.PENDING_REVIEW,
          DocumentStatus.PENDING_APPROVAL,
        ])
        .count('* as total')
        .first(),
      base
        .clone()
        .where((q) => {
          q.where('status', DocumentStatus.ARCHIVED).orWhere(
            'lifecycle_status',
            RecordsLifecycleStatus.ARCHIVED
          )
        })
        .count('* as total')
        .first(),
      base.clone().whereNotNull('retention_schedule_id').count('* as total').first(),
      base
        .clone()
        .whereNotNull('retention_due_at')
        .where('retention_due_at', '<=', DateTime.now().toSQL()!)
        .count('* as total')
        .first(),
      this.groupCount(base.clone(), 'status'),
      this.groupCount(base.clone().whereNotNull('nap_category'), 'nap_category'),
      this.groupCount(base.clone().whereNotNull('department_id'), 'department_id'),
      RoutingEntry.query()
        .where('tenant_id', tenantId)
        .whereBetween('routed_at', [from.toSQL()!, to.toSQL()!])
        .count('* as total')
        .first(),
      Approval.query()
        .where('tenant_id', tenantId)
        .whereBetween('acted_at', [from.toSQL()!, to.toSQL()!])
        .count('* as total')
        .first(),
      this.averageElapsedHours(tenantId, from, to, filters),
      RecordRequest.query()
        .where('tenant_id', tenantId)
        .whereBetween('created_at', [from.toSQL()!, to.toSQL()!])
        .count('* as total')
        .first(),
      RecordRequest.query()
        .where('tenant_id', tenantId)
        .whereIn('status', ['pending', 'approved', 'checked_out', 'partially_returned'])
        .count('* as total')
        .first(),
      this.averageRecordRequestHours(tenantId, from, to),
      this.volumeHandledByStaff(tenantId, from, to),
      this.groupCount(
        this.documentsBase(tenantId, filters)
          .whereNotNull('receiving_office_id')
          .whereNotNull('received_at')
          .whereBetween('received_at', [from.toSQL()!, to.toSQL()!]),
        'receiving_office_id'
      ),
      this.groupCount(
        this.documentsBase(tenantId, filters)
          .whereNotNull('originating_office_id')
          .whereBetween('created_at', [from.toSQL()!, to.toSQL()!]),
        'originating_office_id'
      ),
      this.documentsBase(tenantId, filters)
        .where('status', DocumentStatus.RELEASED)
        .whereBetween('completed_at', [from.toSQL()!, to.toSQL()!])
        .count('* as total')
        .first(),
      AuditLog.query()
        .where('tenant_id', tenantId)
        .where('entity_type', 'document')
        .whereBetween('created_at', [from.toSQL()!, to.toSQL()!])
        .count('* as total')
        .first(),
      this.registrationTrend(tenantId, from, to, filters),
      this.recentDocumentActivity(tenantId, user.id, 10),
    ])

    return {
      period: { from: from.toISO(), to: to.toISO() },
      generatedAt: DateTime.now().toISO(),
      metrics: {
        totalDocuments: Number(totalRow?.$extras.total ?? 0),
        registeredInPeriod: Number(periodRow?.$extras.total ?? 0),
        currentlyAssigned: Number(assignedRow?.$extras.total ?? 0),
        awaitingAction: Number(awaitingRow?.$extras.total ?? 0),
        archivedDocuments: Number(archivedRow?.$extras.total ?? 0),
        withRetentionSchedule: Number(withScheduleRow?.$extras.total ?? 0),
        retentionDue: Number(retentionDueRow?.$extras.total ?? 0),
        routingEventsInPeriod: Number(routingCount?.$extras.total ?? 0),
        approvalActionsInPeriod: Number(approvalCount?.$extras.total ?? 0),
        averageElapsedHoursSubmitToComplete: elapsed,
        recordRequestsInPeriod: Number(recordReqCount?.$extras.total ?? 0),
        pendingRecordRequests: Number(pendingRecordReqCount?.$extras.total ?? 0),
        averageRecordRequestProcessingHours: avgRecordRequestHours,
        releasedInPeriod: Number(releasedInPeriod?.$extras.total ?? 0),
        auditActionsInPeriod: Number(auditCount?.$extras.total ?? 0),
      },
      distributions: {
        byStatus,
        byNapCategory: byNap,
        byDepartmentId: byDept,
        receivedByReceivingOfficeId: receivedByOffice,
        byOriginatingOfficeId: originatingByOffice,
        volumeHandledByStaffId: volumeByStaff,
      },
      registrationTrend,
      recentActivity,
      metricDefinitions: {
        ...METRIC_DEFINITIONS,
        pendingRecordRequests:
          'Count of record_requests in pending/approved/checked_out/partially_returned (source: record_requests)',
        averageRecordRequestProcessingHours:
          'Mean hours between created_at and released_at for released requests in period; null when no samples',
        releasedInPeriod:
          'Count of documents with status=released and completed_at in period (source: documents)',
        receivedByReceivingOfficeId:
          'Documents with received_at in period grouped by receiving_office_id',
        byOriginatingOfficeId:
          'Documents created in period grouped by originating_office_id',
        volumeHandledByStaffId:
          'Approval actions in period grouped by approver_id (descriptive volume, not a performance target)',
      },
      policyNotes: {
        overdueSla:
          'For Clarification — TOR mentions turnaround; no campus SLA deadlines defined. Awaiting-action counts use status only.',
        chartFormats: 'For Clarification — chart presentation formats beyond TOR-named indicators',
        pdfExport:
          'Spreadsheet export provided as CSV; printable HTML view supports browser Print-to-PDF until a campus PDF template is approved',
      },
    }
  }

  async getRegistrationReport(user: User, filters: UdmsReportFilters) {
    this.assertViewer(user)
    const { from, to } = this.parseRange(filters)
    const tenantId = tenantContext.requireTenantId()
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 25, 200)

    const query = this.documentsBase(tenantId, filters)
      .whereBetween('created_at', [from.toSQL()!, to.toSQL()!])
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .orderBy('created_at', 'desc')

    documentRepository.applyDraftVisibilityScope(query, user.id)
    const paginator = await query.paginate(page, limit)

    const [byType, byNap, byOffice, byCreator, trend] = await Promise.all([
      this.groupCount(
        this.documentsBase(tenantId, filters)
          .whereBetween('created_at', [from.toSQL()!, to.toSQL()!])
          .whereNotNull('document_type_id'),
        'document_type_id'
      ),
      this.groupCount(
        this.documentsBase(tenantId, filters)
          .whereBetween('created_at', [from.toSQL()!, to.toSQL()!])
          .whereNotNull('nap_category'),
        'nap_category'
      ),
      this.groupCount(
        this.documentsBase(tenantId, filters)
          .whereBetween('created_at', [from.toSQL()!, to.toSQL()!])
          .whereNotNull('department_id'),
        'department_id'
      ),
      this.groupCount(
        this.documentsBase(tenantId, filters).whereBetween('created_at', [
          from.toSQL()!,
          to.toSQL()!,
        ]),
        'created_by_id'
      ),
      this.registrationTrend(tenantId, from, to, filters),
    ])

    return {
      period: { from: from.toISO(), to: to.toISO() },
      aggregates: {
        byDocumentTypeId: byType,
        byNapCategory: byNap,
        byDepartmentId: byOffice,
        byCreatedById: byCreator,
      },
      trend,
      data: paginator.all().map((doc) => DocumentSerializer.serialize(doc)),
      meta: paginator.getMeta(),
      metricDefinitions: {
        registeredInPeriod: METRIC_DEFINITIONS.registeredInPeriod,
        byNapCategory: METRIC_DEFINITIONS.byNapCategory,
        byOffice: METRIC_DEFINITIONS.byOffice,
      },
    }
  }

  async getWorkflowReport(user: User, filters: UdmsReportFilters) {
    this.assertViewer(user)
    const { from, to } = this.parseRange(filters)
    const tenantId = tenantContext.requireTenantId()

    const routingQuery = RoutingEntry.query()
      .where('tenant_id', tenantId)
      .whereBetween('routed_at', [from.toSQL()!, to.toSQL()!])
      .preload('fromUser')
      .preload('toUser')
      .orderBy('routed_at', 'desc')
      .limit(100)

    if (filters.officeId) {
      routingQuery.where((q) => {
        q.where('from_department_id', filters.officeId!).orWhere(
          'to_department_id',
          filters.officeId!
        )
      })
    }

    const [byAction, byApprovalAction, assigned, awaiting, routingRows, approvals] =
      await Promise.all([
        this.routingGroupCount(tenantId, from, to, filters.officeId),
        this.approvalGroupCount(tenantId, from, to),
        this.documentsBase(tenantId, filters)
          .whereNotNull('assigned_to_id')
          .count('* as total')
          .first(),
        this.documentsBase(tenantId, filters)
          .whereIn('status', [
            DocumentStatus.SUBMITTED,
            DocumentStatus.RECEIVED,
            DocumentStatus.PENDING_REVIEW,
            DocumentStatus.PENDING_APPROVAL,
          ])
          .count('* as total')
          .first(),
        routingQuery,
        Approval.query()
          .where('tenant_id', tenantId)
          .whereBetween('acted_at', [from.toSQL()!, to.toSQL()!])
          .preload('approver')
          .orderBy('acted_at', 'desc')
          .limit(100),
      ])

    return {
      period: { from: from.toISO(), to: to.toISO() },
      metrics: {
        currentlyAssigned: Number(assigned?.$extras.total ?? 0),
        awaitingAction: Number(awaiting?.$extras.total ?? 0),
        routingEventsInPeriod: Object.values(byAction).reduce((a, b) => a + b, 0),
        approvalActionsInPeriod: Object.values(byApprovalAction).reduce((a, b) => a + b, 0),
      },
      distributions: {
        routingByAction: byAction,
        approvalsByAction: byApprovalAction,
      },
      recentRouting: routingRows.map((entry) => ({
        id: entry.id,
        documentId: entry.documentId,
        action: entry.action,
        routedAt: entry.routedAt.toISO(),
        remarks: entry.remarks,
        fromUserId: entry.fromUserId,
        toUserId: entry.toUserId,
        fromDepartmentId: entry.fromDepartmentId,
        toDepartmentId: entry.toDepartmentId,
      })),
      recentApprovals: approvals.map((row) => ({
        id: row.id,
        documentId: row.documentId,
        action: row.action,
        actedAt: row.actedAt.toISO(),
        comments: row.comments,
        approverId: row.approverId,
      })),
      metricDefinitions: {
        currentlyAssigned: METRIC_DEFINITIONS.currentlyAssigned,
        awaitingActionStatuses: METRIC_DEFINITIONS.awaitingActionStatuses,
        routingEventsInPeriod: METRIC_DEFINITIONS.routingEventsInPeriod,
        approvalActionsInPeriod: METRIC_DEFINITIONS.approvalActionsInPeriod,
      },
      policyNotes: {
        assignmentIsNotReceipt:
          'Assignment/routing counts do not imply receipt, review, or completion',
        overdueSla:
          'For Clarification — no campus deadline matrix; turnaround elapsed hours available on dashboard only when completed_at exists',
      },
    }
  }

  async getArchivalReport(user: User, filters: UdmsReportFilters) {
    this.assertViewer(user)
    const { from, to } = this.parseRange(filters)
    const tenantId = tenantContext.requireTenantId()
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 25, 200)
    const now = DateTime.now()

    const archivedQuery = this.documentsBase(tenantId, filters)
      .where((q) => {
        q.where('status', DocumentStatus.ARCHIVED).orWhere(
          'lifecycle_status',
          RecordsLifecycleStatus.ARCHIVED
        )
      })
      .preload('department')
      .preload('documentType')
      .orderBy('archived_at', 'desc')

    documentRepository.applyDraftVisibilityScope(archivedQuery, user.id)
    const paginator = await archivedQuery.paginate(page, limit)

    const [archivedInPeriod, withSchedule, due, missingRetention, byLifecycle] = await Promise.all([
      this.documentsBase(tenantId, filters)
        .where((q) => {
          q.where('status', DocumentStatus.ARCHIVED).orWhere(
            'lifecycle_status',
            RecordsLifecycleStatus.ARCHIVED
          )
        })
        .whereNotNull('archived_at')
        .whereBetween('archived_at', [from.toSQL()!, to.toSQL()!])
        .count('* as total')
        .first(),
      this.documentsBase(tenantId, filters)
        .whereNotNull('retention_schedule_id')
        .count('* as total')
        .first(),
      this.documentsBase(tenantId, filters)
        .whereNotNull('retention_due_at')
        .where('retention_due_at', '<=', now.toSQL()!)
        .count('* as total')
        .first(),
      this.documentsBase(tenantId, filters)
        .whereNull('retention_schedule_id')
        .count('* as total')
        .first(),
      this.groupCount(this.documentsBase(tenantId, filters), 'lifecycle_status'),
    ])

    return {
      period: { from: from.toISO(), to: to.toISO() },
      metrics: {
        archivedDocuments: paginator.getMeta().total,
        archivedInPeriod: Number(archivedInPeriod?.$extras.total ?? 0),
        withRetentionSchedule: Number(withSchedule?.$extras.total ?? 0),
        retentionDue: Number(due?.$extras.total ?? 0),
        missingRetentionSchedule: Number(missingRetention?.$extras.total ?? 0),
      },
      distributions: { byLifecycleStatus: byLifecycle },
      data: paginator.all().map((doc) => DocumentSerializer.serialize(doc)),
      meta: paginator.getMeta(),
      metricDefinitions: {
        archivedDocuments: METRIC_DEFINITIONS.archivedDocuments,
        withRetentionSchedule: METRIC_DEFINITIONS.withRetentionSchedule,
        retentionDue: METRIC_DEFINITIONS.retentionDue,
        missingRetentionSchedule:
          'Count where retention_schedule_id is null — missing policy, not an expired period',
      },
      policyNotes: {
        retentionPeriods: 'For Clarification — official NAP period tables not approved',
        disposalEligibility: 'Due dates do not authorize disposal without approved workflow',
      },
    }
  }

  toCsv(
    kind: 'registration' | 'archival' | 'dashboard',
    payload: Record<string, unknown>
  ): string {
    if (kind === 'dashboard') {
      const metrics = (payload.metrics ?? {}) as Record<string, unknown>
      const lines = ['metric,value']
      for (const [key, value] of Object.entries(metrics)) {
        lines.push(`${this.csvEscape(key)},${this.csvEscape(value)}`)
      }
      lines.push('')
      lines.push('definition_key,definition')
      const defs = (payload.metricDefinitions ?? {}) as Record<string, string>
      for (const [key, value] of Object.entries(defs)) {
        lines.push(`${this.csvEscape(key)},${this.csvEscape(value)}`)
      }
      return lines.join('\n')
    }

    const rows = (payload.data ?? []) as Array<Record<string, unknown>>
    const header = [
      'id',
      'trackingNumber',
      'title',
      'status',
      'napCategory',
      'lifecycleStatus',
      'departmentId',
      'createdAt',
      'archivedAt',
      'retentionDueAt',
    ]
    const lines = [header.join(',')]
    for (const row of rows) {
      lines.push(
        header
          .map((key) => this.csvEscape(row[key] ?? null))
          .join(',')
      )
    }
    return lines.join('\n')
  }

  private assertViewer(_user: User) {
    // Permission enforced at route middleware (reports.view)
  }

  private parseRange(filters: UdmsReportFilters) {
    const to = filters.to ? DateTime.fromISO(filters.to) : DateTime.now().endOf('day')
    const from = filters.from
      ? DateTime.fromISO(filters.from)
      : to.minus({ days: 30 }).startOf('day')

    if (!from.isValid || !to.isValid) {
      throw new UdmsReportsValidationException('Invalid from/to date (use ISO-8601)')
    }
    if (from > to) {
      throw new UdmsReportsValidationException('from must be before or equal to to')
    }
    return { from: from.startOf('day'), to: to.endOf('day') }
  }

  private documentsBase(tenantId: string, filters: UdmsReportFilters) {
    const query = Document.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')

    if (filters.officeId) {
      query.where((q) => {
        q.where('department_id', filters.officeId!)
          .orWhere('originating_office_id', filters.officeId!)
          .orWhere('receiving_office_id', filters.officeId!)
      })
    }
    if (filters.documentTypeId) query.where('document_type_id', filters.documentTypeId)
    if (filters.napCategory) query.where('nap_category', filters.napCategory)
    if (filters.status) query.where('status', filters.status)
    if (filters.lifecycleStatus) query.where('lifecycle_status', filters.lifecycleStatus)

    return query
  }

  private async groupCount(
    query: ReturnType<typeof Document.query>,
    column: string
  ): Promise<Record<string, number>> {
    const rows = await query.clone().groupBy(column).select(column).count('* as total')
    return rows.reduce<Record<string, number>>((acc, row) => {
      const key = String((row as any)[this.camel(column)] ?? (row as any)[column] ?? 'unknown')
      acc[key] = Number(row.$extras.total ?? 0)
      return acc
    }, {})
  }

  private camel(column: string) {
    return column.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  }

  private async routingGroupCount(
    tenantId: string,
    from: DateTime,
    to: DateTime,
    officeId?: string
  ) {
    const query = RoutingEntry.query()
      .where('tenant_id', tenantId)
      .whereBetween('routed_at', [from.toSQL()!, to.toSQL()!])
      .groupBy('action')
      .select('action')
      .count('* as total')
    if (officeId) {
      query.where((q) => {
        q.where('from_department_id', officeId).orWhere('to_department_id', officeId)
      })
    }
    const rows = await query
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.action] = Number(row.$extras.total ?? 0)
      return acc
    }, {})
  }

  private async approvalGroupCount(tenantId: string, from: DateTime, to: DateTime) {
    const rows = await Approval.query()
      .where('tenant_id', tenantId)
      .whereBetween('acted_at', [from.toSQL()!, to.toSQL()!])
      .groupBy('action')
      .select('action')
      .count('* as total')
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.action] = Number(row.$extras.total ?? 0)
      return acc
    }, {})
  }

  private async averageRecordRequestHours(
    tenantId: string,
    from: DateTime,
    to: DateTime
  ): Promise<number | null> {
    const rows = await RecordRequest.query()
      .where('tenant_id', tenantId)
      .whereNotNull('released_at')
      .whereBetween('released_at', [from.toSQL()!, to.toSQL()!])
      .select('created_at', 'released_at')
      .limit(500)

    if (!rows.length) return null
    let totalHours = 0
    let samples = 0
    for (const row of rows) {
      if (!row.createdAt || !row.releasedAt) continue
      const hours = row.releasedAt.diff(row.createdAt, 'hours').hours
      if (hours < 0) continue
      totalHours += hours
      samples += 1
    }
    if (!samples) return null
    return Math.round((totalHours / samples) * 100) / 100
  }

  private async volumeHandledByStaff(
    tenantId: string,
    from: DateTime,
    to: DateTime
  ): Promise<Record<string, number>> {
    const rows = await Approval.query()
      .where('tenant_id', tenantId)
      .whereBetween('acted_at', [from.toSQL()!, to.toSQL()!])
      .groupBy('approver_id')
      .select('approver_id')
      .count('* as total')
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.approverId] = Number(row.$extras.total ?? 0)
      return acc
    }, {})
  }

  private async averageElapsedHours(
    tenantId: string,
    from: DateTime,
    to: DateTime,
    filters: UdmsReportFilters
  ): Promise<number | null> {
    const query = this.documentsBase(tenantId, filters)
      .whereNotNull('submitted_at')
      .whereNotNull('completed_at')
      .whereBetween('completed_at', [from.toSQL()!, to.toSQL()!])
      .select('submitted_at', 'completed_at')
      .limit(500)

    const rows = await query
    if (!rows.length) return null
    let totalHours = 0
    let samples = 0
    for (const row of rows) {
      if (!row.submittedAt || !row.completedAt) continue
      const hours = row.completedAt.diff(row.submittedAt, 'hours').hours
      if (hours < 0) continue
      totalHours += hours
      samples += 1
    }
    if (!samples) return null
    return Math.round((totalHours / samples) * 100) / 100
  }

  private async registrationTrend(
    tenantId: string,
    from: DateTime,
    to: DateTime,
    filters: UdmsReportFilters
  ) {
    const query = db
      .from('documents')
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .whereBetween('created_at', [from.toSQL()!, to.toSQL()!])

    if (filters.officeId) {
      query.where((q) => {
        q.where('department_id', filters.officeId!)
          .orWhere('originating_office_id', filters.officeId!)
          .orWhere('receiving_office_id', filters.officeId!)
      })
    }
    if (filters.documentTypeId) query.where('document_type_id', filters.documentTypeId)
    if (filters.napCategory) query.where('nap_category', filters.napCategory)
    if (filters.status) query.where('status', filters.status)

    const result = await query
      .select(db.raw(`to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day`))
      .count('* as total')
      .groupByRaw(`date_trunc('day', created_at)`)
      .orderByRaw(`date_trunc('day', created_at)`)

    return result.map((row: any) => ({
      day: String(row.day),
      total: Number(row.total ?? 0),
    }))
  }

  private async recentDocumentActivity(tenantId: string, viewerUserId: string, limit: number) {
    const page = await documentRepository.paginate({
      page: 1,
      limit,
      viewerUserId,
    })
    return page.all().map((doc) => ({
      id: doc.id,
      title: doc.title,
      trackingNumber: doc.trackingNumber,
      status: doc.status,
      updatedAt: doc.updatedAt?.toISO?.() ?? String(doc.updatedAt),
    }))
  }

  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) return ''
    const text = String(value)
    if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
    return text
  }
}

export const udmsReportsService = new UdmsReportsService()
