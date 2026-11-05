import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'
import {
  AuditAction,
  DocumentStatus,
  RecordsLifecycleStatus,
} from '#modules/documents/domain/enums/index'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { DocumentConfidentialityPolicy } from '#modules/documents/domain/documents/document_confidentiality_policy'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentVersionService } from '#modules/documents/services/document_file_service'
import { documentService } from '#modules/documents/services/document_service'
import { retentionScheduleService } from '#modules/documents/services/retention_schedule_service'
import { archivesService } from '#modules/documents/services/archives_service'
import { recordsLifecycleService } from '#modules/documents/services/records_lifecycle_service'
import { auditService } from '#modules/documents/services/audit_service'
import { formatVersionLabel } from '#modules/documents/domain/documents/document_version_label'

export class UdmsLifecycleValidationException extends Exception {
  constructor(message: string) {
    super(message, { status: 422, code: 'E_UDMS_LIFECYCLE_VALIDATION' })
  }
}

const POLICY_NOTES = {
  retentionPeriods:
    'For Clarification — official NAP/COA/CHED period tables not approved; use configured schedules only',
  disposalAuthorities:
    'For Clarification — multi-level disposal authorities and witness rules not defined',
  contentDiff:
    'Version history lists metadata and file refs; binary content-diff is not claimed as semantic comparison',
  autoLifecycleTriggers:
    'For Clarification — automatic Active→Semi-active→Inactive timing from retention calendars',
}

export class UdmsLifecycleService {
  async listVersions(documentId: string, user: User, page = 1, limit = 25) {
    const document = await documentRepository.findByIdOrFail(documentId, user.id)
    await DocumentConfidentialityPolicy.assertCanView(
      document,
      user,
      tenantContext.requireTenantId()
    )
    const result = await documentVersionService.list(documentId, user.id, page, limit)
    const current = result.versions[0] ?? null
    return {
      documentId,
      currentVersion: current
        ? {
            id: current.id,
            label: current.label,
            status: current.status,
            createdAt: current.createdAt,
          }
        : null,
      versions: result.versions,
      meta: result.meta,
      policyNotes: { contentDiff: POLICY_NOTES.contentDiff },
    }
  }

  async createVersion(documentId: string, user: User, changeNotes?: string) {
    const version = await documentVersionService.create(documentId, user.id, changeNotes)
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      versionMinor: version.versionMinor ?? 0,
      label: formatVersionLabel(version.versionNumber, version.versionMinor ?? 0),
      changeNotes: version.changeNotes,
      status: version.status,
      submittedAt: version.submittedAt,
      createdAt: version.createdAt,
    }
  }

  async listArchived(user: User, filters: { page?: number; limit?: number; search?: string }) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 25, 100)
    const tenantId = tenantContext.requireTenantId()

    const query = Document.query()
      .withScopes((scopes) => {
        scopes.forTenant()
        scopes.notDeleted()
      })
      .where('tenant_id', tenantId)
      .where((q) => {
        q.where('status', DocumentStatus.ARCHIVED).orWhere(
          'lifecycle_status',
          RecordsLifecycleStatus.ARCHIVED
        )
      })
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .preload('assignedTo')
      .orderBy('archived_at', 'desc')

    if (filters.search?.trim()) {
      const term = filters.search.trim()
      query.where((sub) => {
        sub.whereILike('title', `%${term}%`).orWhereILike('tracking_number', `%${term}%`)
      })
    }

    documentRepository.applyDraftVisibilityScope(query, user.id)
    const paginator = await query.paginate(page, limit)
    return DocumentSerializer.serializePaginated(paginator as any)
  }

  async archive(documentId: string, user: User) {
    const document = await documentService.archive(documentId, user.id)
    return DocumentSerializer.serializeDetail(document)
  }

  async restore(
    documentId: string,
    user: User,
    input: { remarks: string; targetLifecycleStatus?: string }
  ) {
    const document = await documentRepository.findByIdOrFail(documentId, user.id)
    DocumentAccessPolicy.assertCanModify(document, user.id)

    if (
      document.status !== DocumentStatus.ARCHIVED &&
      document.lifecycleStatus !== RecordsLifecycleStatus.ARCHIVED
    ) {
      throw new UdmsLifecycleValidationException('Only archived documents can be restored')
    }
    if (document.deletedAt) {
      throw new UdmsLifecycleValidationException(
        'Disposed/soft-deleted documents cannot be restored through this path'
      )
    }

    const nextLifecycle =
      input.targetLifecycleStatus ?? RecordsLifecycleStatus.INACTIVE

    document.status = DocumentStatus.COMPLETED
    document.archivedAt = null
    await document.save()

    await recordsLifecycleService.transitionLifecycle(document, nextLifecycle, user, {
      reason: `udms_restore:${input.remarks}`,
    })

    await auditService.log({
      tenantId: document.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'document',
      entityId: document.id,
      metadata: {
        module: 'udms',
        prompt: '05',
        tor: 'DMS-019/020',
        action: 'restore',
        remarks: input.remarks,
      },
    })

    return DocumentSerializer.serializeDetail(
      await documentRepository.findByIdOrFail(documentId, user.id)
    )
  }

  async listRetentionSchedules() {
    const schedules = await retentionScheduleService.list()
    return {
      data: schedules.map((s) => retentionScheduleService.serialize(s)),
      policyNotes: {
        retentionPeriods: POLICY_NOTES.retentionPeriods,
      },
    }
  }

  async applyRetention(documentId: string, user: User, retentionScheduleId: string) {
    const document = await documentRepository.findByIdOrFail(documentId, user.id)
    DocumentAccessPolicy.assertCanModify(document, user.id)

    if (document.status === DocumentStatus.ARCHIVED) {
      throw new UdmsLifecycleValidationException(
        'Archived documents cannot receive retention schedule changes'
      )
    }

    const scheduleFields = await retentionScheduleService.applyScheduleToDocumentFields({
      retentionScheduleId,
      napCategory: document.napCategory,
      documentDate: document.documentDate,
      receivedAt: document.receivedAt,
      dispositionAction: document.dispositionAction,
    })

    const previous = {
      retentionScheduleId: document.retentionScheduleId,
      retentionDueAt: document.retentionDueAt?.toISO() ?? null,
      dispositionAction: document.dispositionAction,
      napCategory: document.napCategory,
    }

    document.retentionScheduleId = scheduleFields.retentionScheduleId
    document.retentionDueAt = scheduleFields.retentionDueAt
    document.dispositionAction = scheduleFields.dispositionAction
    if (scheduleFields.napCategory) document.napCategory = scheduleFields.napCategory
    await document.save()

    await auditService.log({
      tenantId: document.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'document',
      entityId: document.id,
      oldValues: previous,
      newValues: {
        retentionScheduleId: document.retentionScheduleId,
        retentionDueAt: document.retentionDueAt?.toISO() ?? null,
        dispositionAction: document.dispositionAction,
        napCategory: document.napCategory,
      },
      metadata: { module: 'udms', prompt: '05', tor: 'DMS-009', action: 'apply_retention' },
    })

    return DocumentSerializer.serializeDetail(
      await documentRepository.findByIdOrFail(documentId, user.id)
    )
  }

  async listRetentionDue(
    user: User,
    filters: { page?: number; limit?: number; search?: string }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 25, 100)
    const tenantId = tenantContext.requireTenantId()
    const now = DateTime.now().toSQL()!

    const query = Document.query()
      .withScopes((scopes) => {
        scopes.forTenant()
        scopes.notDeleted()
      })
      .where('tenant_id', tenantId)
      .whereNotNull('retention_due_at')
      .where('retention_due_at', '<=', now)
      .whereNot('status', DocumentStatus.ARCHIVED)
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .orderBy('retention_due_at', 'asc')

    if (filters.search?.trim()) {
      const term = filters.search.trim()
      query.where((sub) => {
        sub.whereILike('title', `%${term}%`).orWhereILike('tracking_number', `%${term}%`)
      })
    }

    documentRepository.applyDraftVisibilityScope(query, user.id)
    const paginator = await query.paginate(page, limit)
    return {
      ...DocumentSerializer.serializePaginated(paginator as any),
      policyNotes: {
        retentionPeriods: POLICY_NOTES.retentionPeriods,
        autoLifecycleTriggers: POLICY_NOTES.autoLifecycleTriggers,
      },
    }
  }

  async setLifecycle(
    documentId: string,
    user: User,
    input: { lifecycleStatus: string; remarks?: string }
  ) {
    const document = await documentRepository.findByIdOrFail(documentId, user.id)
    DocumentAccessPolicy.assertCanModify(document, user.id)
    await recordsLifecycleService.transitionLifecycle(document, input.lifecycleStatus, user, {
      reason: input.remarks ? `udms:${input.remarks}` : 'udms_lifecycle',
    })
    return DocumentSerializer.serializeDetail(
      await documentRepository.findByIdOrFail(documentId, user.id)
    )
  }

  async getLifecycleSummary(documentId: string, user: User) {
    const document = await documentRepository.findByIdOrFail(documentId, user.id)
    await DocumentConfidentialityPolicy.assertCanView(
      document,
      user,
      tenantContext.requireTenantId()
    )

    let schedule = null
    if (document.retentionScheduleId) {
      try {
        const row = await retentionScheduleService.findByIdOrFail(document.retentionScheduleId)
        schedule = retentionScheduleService.serialize(row)
      } catch {
        schedule = null
      }
    }

    const versions = await documentVersionService.list(documentId, user.id, 1, 5)

    return {
      document: DocumentSerializer.serializeDetail(document),
      retention: {
        scheduleId: document.retentionScheduleId,
        schedule,
        dueAt: document.retentionDueAt?.toISO() ?? null,
        dispositionAction: document.dispositionAction,
        legalHold: document.legalHold,
        legalHoldReason: document.legalHoldReason,
      },
      lifecycle: {
        status: document.lifecycleStatus,
        documentStatus: document.status,
        archivedAt: document.archivedAt?.toISO() ?? null,
      },
      currentVersion: versions.versions[0] ?? null,
      policyNotes: POLICY_NOTES,
    }
  }

  async setLegalHold(
    documentId: string,
    user: User,
    input: { hold: boolean; reason: string }
  ) {
    return archivesService.setLegalHold(documentId, input, user)
  }

  async listTransfers(filters: { status?: string; page?: number; limit?: number }) {
    return {
      ...(await archivesService.listTransfers(filters)),
      policyNotes: { disposalAuthorities: POLICY_NOTES.disposalAuthorities },
    }
  }

  async createTransfer(input: { title: string; documentIds: string[] }, user: User) {
    return archivesService.createTransfer(input, user)
  }

  async approveTransfer(id: string, user: User) {
    return archivesService.approveTransfer(id, user)
  }

  async completeTransfer(id: string, user: User) {
    return archivesService.completeTransfer(id, user)
  }

  async listDisposals(filters: { status?: string; page?: number; limit?: number }) {
    return {
      ...(await archivesService.listDisposals(filters)),
      policyNotes: {
        disposalAuthorities: POLICY_NOTES.disposalAuthorities,
        note: 'Execute only after authorized approval; permanent delete without multi-level workflow remains FC',
      },
    }
  }

  async createDisposal(
    input: { title: string; justification: string; documentIds: string[] },
    user: User
  ) {
    return archivesService.createDisposal(input, user)
  }

  async approveDisposal(id: string, user: User) {
    return archivesService.approveDisposal(id, user)
  }

  async executeDisposal(id: string, user: User, notes?: string) {
    return archivesService.executeDisposal(id, user, notes)
  }
}

export const udmsLifecycleService = new UdmsLifecycleService()
