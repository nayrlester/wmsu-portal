import { DateTime } from 'luxon'
import type Document from '#modules/documents/models/document'
import type {
  CreateDocumentDto,
  DocumentListFilters,
  UpdateDocumentDto,
} from '#modules/documents/domain/documents/document_dto'
import { DocumentPolicy } from '#modules/documents/domain/documents/document_policy'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { INITIAL_DRAFT_VERSION } from '#modules/documents/domain/documents/document_version_label'
import { DocumentVersionPolicy } from '#modules/documents/domain/documents/document_version_policy'
import { DocumentReferenceNotFoundException } from '#modules/documents/domain/documents/document_exceptions'
import { DocumentPriority, DocumentStatus, DocumentVisibility, DocumentSourceType, DocumentConfidentiality, RecordsLifecycleStatus, AuditAction } from '#modules/documents/domain/enums/index'
import { sanitizeHtml } from '#modules/documents/domain/documents/html_sanitizer'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentVersionRepository } from '#infrastructure/repositories/document_version_repository'
import { documentVersionService } from '#modules/documents/services/document_file_service'
import { departmentRepository } from '#infrastructure/repositories/department_repository'
import { documentTypeRepository } from '#infrastructure/repositories/document_type_repository'
import { trackingNumberService } from '#modules/documents/services/tracking_number_service'
import { auditService } from '#modules/documents/services/audit_service'
import { planLimitService } from '#modules/documents/services/plan_limit_service'
import { workflowEngineService } from '#modules/documents/services/workflow_engine_service'
import { defaultWorkflowService } from '#modules/documents/services/default_workflow_service'
import { routingService } from '#modules/documents/services/routing_service'
import { slaService } from '#modules/documents/services/sla_service'
import { qrCodeService } from '#modules/documents/services/qr_code_service'
import { retentionScheduleService } from '#modules/documents/services/retention_schedule_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { cacheService } from '#infrastructure/cache/redis_cache_service'
import { dashboardAnalyticsService } from '#modules/documents/services/dashboard_analytics_service'
import { recordsInventoryService } from '#modules/documents/services/records_inventory_service'
import env from '#start/env'

const DASHBOARD_CACHE_TTL = () => env.get('CACHE_TTL_DASHBOARD_SECONDS') ?? 300

export class DocumentService {
  async list(filters: DocumentListFilters, userId: string) {
    return documentRepository.paginate({ ...filters, viewerUserId: userId })
  }

  async search(filters: DocumentListFilters, userId: string) {
    return documentRepository.search({ ...filters, viewerUserId: userId })
  }

  async findById(id: string, userId: string): Promise<Document> {
    const document = await documentRepository.findByIdSummary(id, userId)
    DocumentAccessPolicy.applyVersionVisibility(document, userId)
    return document
  }

  async findByIdFull(id: string, userId: string): Promise<Document> {
    const document = await documentRepository.findByIdOrFail(id, userId)
    DocumentAccessPolicy.applyVersionVisibility(document, userId)
    return document
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Document> {
    return documentRepository.findByTrackingNumber(trackingNumber)
  }

  async create(dto: CreateDocumentDto, userId: string): Promise<Document> {
    const tenantId = tenantContext.requireTenantId()
    await planLimitService.assertCanCreateDocument(tenantId)
    await this.assertReferences(dto.departmentId, dto.documentTypeId)
    await this.assertOfficeReferences(dto.originatingOfficeId, dto.receivingOfficeId)

    const trackingNumber = await trackingNumberService.generate(tenantId)
    const visibility = (dto.visibility as DocumentVisibility) ?? DocumentVisibility.PRIVATE
    const hasContent = Boolean(dto.contentHtml?.trim())
    const sourceType = hasContent
      ? DocumentSourceType.EDITOR
      : ((dto.sourceType as DocumentSourceType) ?? DocumentSourceType.UPLOAD)
    const contentHtml = hasContent ? sanitizeHtml(dto.contentHtml!) : null

    const documentDate = dto.documentDate ? DateTime.fromISO(dto.documentDate) : null
    const receivedAt = dto.receivedAt ? DateTime.fromISO(dto.receivedAt) : DateTime.now()
    const scheduleFields = await retentionScheduleService.applyScheduleToDocumentFields({
      retentionScheduleId: dto.retentionScheduleId ?? null,
      napCategory: dto.napCategory ?? null,
      documentDate,
      receivedAt,
      dispositionAction: dto.dispositionAction ?? null,
    })

    const document = await documentRepository.create({
      tenantId,
      trackingNumber,
      title: dto.title,
      description: dto.description ?? null,
      status: DocumentStatus.DRAFT,
      priority: dto.priority ?? DocumentPriority.MEDIUM,
      documentTypeId: dto.documentTypeId ?? null,
      departmentId: dto.departmentId ?? null,
      assignedToId: dto.assignedToId ?? null,
      createdById: userId,
      metadata: dto.metadata ?? null,
      contentHtml,
      sourceType,
      visibility,
      originatingOfficeId: dto.originatingOfficeId ?? null,
      receivingOfficeId: dto.receivingOfficeId ?? dto.departmentId ?? null,
      documentDate,
      receivedAt,
      subjectKeywords: dto.subjectKeywords ?? null,
      confidentiality: dto.confidentiality ?? DocumentConfidentiality.INTERNAL,
      napCategory: scheduleFields.napCategory,
      retentionScheduleId: scheduleFields.retentionScheduleId,
      lifecycleStatus: dto.lifecycleStatus ?? RecordsLifecycleStatus.ACTIVE,
      retentionDueAt: scheduleFields.retentionDueAt,
      dispositionAction: scheduleFields.dispositionAction,
    })

    await documentRepository.createVersion({
      tenantId,
      documentId: document.id,
      versionNumber: INITIAL_DRAFT_VERSION.major,
      versionMinor: INITIAL_DRAFT_VERSION.minor,
      changeNotes: 'Initial version',
      createdById: userId,
      contentHtml,
      sourceType,
    })

    if (visibility === DocumentVisibility.PUBLIC) {
      document.qrCodeUrl = await qrCodeService.generateDataUrl(trackingNumber)
    }
    await documentRepository.save(document)

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'document',
      entityId: document.id,
      newValues: { trackingNumber, title: dto.title },
    })

    await this.invalidateDashboardCache(tenantId)

    return documentRepository.findByIdOrFail(document.id)
  }

  async update(documentId: string, dto: UpdateDocumentDto, userId: string): Promise<Document> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    DocumentAccessPolicy.assertCanModify(document, userId)
    DocumentPolicy.assertCanUpdate(document.status)
    await this.assertReferences(dto.departmentId ?? undefined, dto.documentTypeId ?? undefined)
    await this.assertOfficeReferences(
      dto.originatingOfficeId ?? undefined,
      dto.receivingOfficeId ?? undefined
    )

    const oldValues = {
      title: document.title,
      description: document.description,
      priority: document.priority,
      documentTypeId: document.documentTypeId,
      departmentId: document.departmentId,
    }

    if (dto.title !== undefined) document.title = dto.title
    if (dto.description !== undefined) document.description = dto.description
    if (dto.priority !== undefined) document.priority = dto.priority
    if (dto.documentTypeId !== undefined) document.documentTypeId = dto.documentTypeId
    if (dto.departmentId !== undefined) document.departmentId = dto.departmentId
    if (dto.assignedToId !== undefined) document.assignedToId = dto.assignedToId
    if (dto.metadata !== undefined) document.metadata = dto.metadata
    if (dto.visibility !== undefined) {
      document.visibility = dto.visibility as DocumentVisibility
      if (document.visibility === DocumentVisibility.PUBLIC) {
        document.qrCodeUrl = await qrCodeService.generateDataUrl(document.trackingNumber)
      }
      if (document.visibility === DocumentVisibility.PRIVATE) {
        document.qrCodeUrl = null
      }
    }
    if (dto.originatingOfficeId !== undefined) document.originatingOfficeId = dto.originatingOfficeId
    if (dto.receivingOfficeId !== undefined) document.receivingOfficeId = dto.receivingOfficeId
    if (dto.documentDate !== undefined) {
      document.documentDate = dto.documentDate ? DateTime.fromISO(dto.documentDate) : null
    }
    if (dto.receivedAt !== undefined) {
      document.receivedAt = dto.receivedAt ? DateTime.fromISO(dto.receivedAt) : null
    }
    if (dto.subjectKeywords !== undefined) document.subjectKeywords = dto.subjectKeywords
    if (dto.confidentiality !== undefined) document.confidentiality = dto.confidentiality
    if (dto.lifecycleStatus !== undefined) document.lifecycleStatus = dto.lifecycleStatus

    const scheduleId =
      dto.retentionScheduleId !== undefined
        ? dto.retentionScheduleId
        : document.retentionScheduleId
    const napCategory =
      dto.napCategory !== undefined ? dto.napCategory : document.napCategory
    const dispositionAction =
      dto.dispositionAction !== undefined ? dto.dispositionAction : document.dispositionAction

    if (
      dto.retentionScheduleId !== undefined ||
      dto.napCategory !== undefined ||
      dto.documentDate !== undefined ||
      dto.receivedAt !== undefined ||
      dto.dispositionAction !== undefined
    ) {
      const scheduleFields = await retentionScheduleService.applyScheduleToDocumentFields({
        retentionScheduleId: scheduleId,
        napCategory,
        documentDate: document.documentDate,
        receivedAt: document.receivedAt,
        dispositionAction,
      })
      document.retentionScheduleId = scheduleFields.retentionScheduleId
      document.napCategory = scheduleFields.napCategory
      document.retentionDueAt = scheduleFields.retentionDueAt
      document.dispositionAction = scheduleFields.dispositionAction
    }

    await documentRepository.save(document)

    await auditService.log({
      tenantId: document.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'document',
      entityId: document.id,
      oldValues,
      newValues: dto as Record<string, unknown>,
    })

    return documentRepository.findByIdOrFail(document.id)
  }

  async delete(documentId: string, userId: string): Promise<void> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    DocumentAccessPolicy.assertCanModify(document, userId)
    DocumentPolicy.assertCanDelete(document.status)

    await documentRepository.softDelete(document)

    await auditService.log({
      tenantId: document.tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'document',
      entityId: document.id,
      oldValues: { trackingNumber: document.trackingNumber, title: document.title },
    })
  }

  async archive(documentId: string, userId: string): Promise<Document> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    DocumentAccessPolicy.assertCanModify(document, userId)
    DocumentPolicy.assertCanArchive(document.status)

    document.status = DocumentStatus.ARCHIVED
    document.archivedAt = DateTime.now()
    document.lifecycleStatus = RecordsLifecycleStatus.ARCHIVED
    await documentRepository.save(document)

    await auditService.log({
      tenantId: document.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'document',
      entityId: document.id,
      metadata: { action: 'archive' },
    })

    return documentRepository.findByIdOrFail(document.id)
  }

  async submit(documentId: string, userId: string): Promise<Document> {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    DocumentAccessPolicy.assertCanModify(document, userId)

    const versions = await documentVersionRepository.listAllByDocument(documentId)
    const submittableVersion = [...versions]
      .reverse()
      .find((version) => DocumentVersionPolicy.canSubmit(version.status))

    if (!submittableVersion) {
      DocumentPolicy.assertCanSubmit(document.status)
    }

    const result = await documentVersionService.submit(documentId, submittableVersion!.id, userId)
    await this.invalidateDashboardCache(result.document.tenantId)
    return result.document
  }

  async getDashboardStats() {
    const tenantId = tenantContext.requireTenantId()
    const cacheKey = `cache:dashboard:${tenantId}`

    return cacheService.remember(cacheKey, DASHBOARD_CACHE_TTL(), async () => {
      const counts = await documentRepository.countByStatusGrouped()
      const sum = (statuses: string[]) =>
        statuses.reduce((total, status) => total + (counts[status] ?? 0), 0)

      const pendingStatuses = [
        DocumentStatus.PENDING_REVIEW,
        DocumentStatus.PENDING_APPROVAL,
        DocumentStatus.SUBMITTED,
        DocumentStatus.RECEIVED,
      ]
      const overdueStatuses = [DocumentStatus.PENDING_REVIEW, DocumentStatus.PENDING_APPROVAL]

      return {
        totalDocuments: Object.values(counts).reduce((total, count) => total + count, 0),
        pendingDocuments: sum(pendingStatuses),
        approvedDocuments: counts[DocumentStatus.APPROVED] ?? 0,
        rejectedDocuments: counts[DocumentStatus.REJECTED] ?? 0,
        overdueDocuments: sum(overdueStatuses),
        records: await recordsInventoryService.summary(),
      }
    })
  }

  async getDashboardTrend(months = 6) {
    const tenantId = tenantContext.requireTenantId()
    const boundedMonths = Math.min(Math.max(months, 1), 12)
    const cacheKey = `cache:dashboard:trend:${tenantId}:${boundedMonths}`

    return cacheService.remember(cacheKey, DASHBOARD_CACHE_TTL(), () =>
      documentRepository.countCreatedByMonth(boundedMonths)
    )
  }

  async getUsageTrend(months = 6) {
    const tenantId = tenantContext.requireTenantId()
    const boundedMonths = Math.min(Math.max(months, 1), 12)
    const cacheKey = `cache:dashboard:usage-trend:${tenantId}:${boundedMonths}`

    return cacheService.remember(cacheKey, DASHBOARD_CACHE_TTL(), () =>
      planLimitService.getUsageTrend(tenantId, boundedMonths)
    )
  }

  async getDashboardOverview(userId: string, months = 6) {
    const tenantId = tenantContext.requireTenantId()
    const cacheKey = `cache:dashboard:overview:${tenantId}:${userId}:${months}`

    return cacheService.remember(cacheKey, DASHBOARD_CACHE_TTL(), async () => {
      const [stats, recent, pendingCount] = await Promise.all([
        this.getDashboardStats(),
        documentRepository.paginate({ limit: 10, page: 1, viewerUserId: userId }),
        documentRepository.countByStatus([
          DocumentStatus.PENDING_REVIEW,
          DocumentStatus.PENDING_APPROVAL,
        ]),
      ])

      return {
        stats,
        recentDocuments: recent.all().map((doc) => ({
          id: doc.id,
          title: doc.title,
          trackingNumber: doc.trackingNumber,
          status: doc.status,
          updatedAt: doc.updatedAt,
        })),
        pendingApprovalsCount: pendingCount,
      }
    })
  }

  async invalidateDashboardCache(tenantId?: string): Promise<void> {
    const id = tenantId ?? tenantContext.getTenantId()
    if (!id) return
    await cacheService.forget(`cache:dashboard:${id}`)
    await cacheService.forget(`cache:dashboard:overview:${id}:6`)
    await cacheService.forget(`cache:dashboard:overview:${id}:12`)
    await dashboardAnalyticsService.invalidateCache(id)
    await Promise.all(
      [6, 12].map(async (months) => {
        await cacheService.forget(`cache:dashboard:trend:${id}:${months}`)
        await cacheService.forget(`cache:dashboard:usage-trend:${id}:${months}`)
      })
    )
  }

  private async assertReferences(departmentId?: string | null, documentTypeId?: string | null) {
    if (departmentId) {
      const department = await departmentRepository.findInTenant(departmentId)
      if (!department) {
        throw new DocumentReferenceNotFoundException('Department not found in this organization')
      }
    }

    if (documentTypeId) {
      const documentType = await documentTypeRepository.findInTenant(documentTypeId)
      if (!documentType) {
        throw new DocumentReferenceNotFoundException('Document type not found in this organization')
      }
    }
  }

  private async assertOfficeReferences(
    originatingOfficeId?: string | null,
    receivingOfficeId?: string | null
  ) {
    await this.assertReferences(originatingOfficeId ?? undefined, null)
    await this.assertReferences(receivingOfficeId ?? undefined, null)
  }
}

export const documentService = new DocumentService()

// Re-export DTOs for backward compatibility
export type { CreateDocumentDto, UpdateDocumentDto, DocumentListFilters } from '#modules/documents/domain/documents/document_dto'
