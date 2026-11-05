import { DateTime } from 'luxon'
import { DocumentPolicy } from '#modules/documents/domain/documents/document_policy'
import { sanitizeHtml, stripHtmlTags } from '#modules/documents/domain/documents/html_sanitizer'
import { formatVersionLabel } from '#modules/documents/domain/documents/document_version_label'
import { documentFileRepository } from '#infrastructure/repositories/document_file_repository'
import { AuditAction, DocumentSourceType, DocumentStatus } from '#modules/documents/domain/enums/index'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentVersionRepository } from '#infrastructure/repositories/document_version_repository'
import { auditService } from '#modules/documents/services/audit_service'
import { dashboardAnalyticsService } from '#modules/documents/services/dashboard_analytics_service'
import { documentService } from '#modules/documents/services/document_service'
import { routingService } from '#modules/documents/services/routing_service'
import { DocumentNotificationAction } from '#modules/documents/domain/notifications/document_notification_actions'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export class DocumentContentService {
  async getContent(documentId: string, viewerUserId: string) {
    const document = await documentRepository.findByIdOrFail(documentId, viewerUserId)
    return {
      contentHtml: document.contentHtml,
      sourceType: document.sourceType,
      versionNumber: document.versions?.[0]?.versionNumber ?? null,
    }
  }

  async saveContent(
    documentId: string,
    userId: string,
    contentHtml: string,
    changeNotes?: string | null
  ) {
    const document = await documentRepository.findByIdOrFail(documentId, userId)
    DocumentPolicy.assertCanModifyVersionContent(document.status)

    const tenantId = tenantContext.requireTenantId()
    const sanitized = stripHtmlTags(contentHtml) ? sanitizeHtml(contentHtml) : null
    const latest = await documentVersionRepository.getLatest(documentId)
    const sourceVersion = latest ?? { versionNumber: 0, versionMinor: 1 }
    const nextVersion = await documentVersionRepository.getNextRevisionVersion(documentId, sourceVersion)
    const versionLabel = formatVersionLabel(nextVersion.major, nextVersion.minor)
    const hasFiles = (await documentFileRepository.countByDocument(documentId)) > 0
    const versionSourceType =
      sanitized === null
        ? hasFiles
          ? DocumentSourceType.UPLOAD
          : DocumentSourceType.EDITOR
        : hasFiles
          ? DocumentSourceType.MIXED
          : DocumentSourceType.EDITOR

    const version = await documentVersionRepository.create({
      tenantId,
      documentId,
      versionNumber: nextVersion.major,
      versionMinor: nextVersion.minor,
      changeNotes: changeNotes ?? `Content updated (${versionLabel})`,
      createdById: userId,
      contentHtml: sanitized,
      sourceType: versionSourceType,
      status: DocumentStatus.DRAFT,
    })

    document.contentHtml = sanitized
    document.sourceType =
      sanitized === null
        ? hasFiles
          ? DocumentSourceType.UPLOAD
          : DocumentSourceType.EDITOR
        : hasFiles
          ? DocumentSourceType.MIXED
          : DocumentSourceType.EDITOR
    await documentRepository.save(document)

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'document',
      entityId: document.id,
      metadata: {
        action: 'content_save',
        versionId: version.id,
        versionNumber: nextVersion.major,
        versionMinor: nextVersion.minor,
        versionLabel,
      },
    })

    await routingService.record({
      tenantId,
      documentId,
      action: DocumentNotificationAction.EDIT,
      fromUserId: userId,
      remarks: changeNotes ?? `Content updated (${versionLabel})`,
    })

    await dashboardAnalyticsService.invalidateCache(tenantId)
    await documentService.invalidateDashboardCache(tenantId)

    return {
      document: await documentRepository.findByIdOrFail(documentId, userId),
      version,
    }
  }

  async saveInitialContent(
    documentId: string,
    userId: string,
    contentHtml: string,
    versionId: string
  ) {
    const sanitized = sanitizeHtml(contentHtml)
    const document = await documentRepository.findByIdOrFail(documentId, userId)

    document.contentHtml = sanitized
    document.sourceType = DocumentSourceType.EDITOR
    await documentRepository.save(document)

    const version = await documentVersionRepository.findById(documentId, versionId)
    if (version) {
      version.contentHtml = sanitized
      version.sourceType = DocumentSourceType.EDITOR
      await version.save()
    }
  }
}

export const documentContentService = new DocumentContentService()
