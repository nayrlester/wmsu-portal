import type Document from '#modules/documents/models/document'
import { ApprovalAction, DocumentVisibility } from '#modules/documents/domain/enums/index'
import { qrCodeService } from '#modules/documents/services/qr_code_service'

export class DocumentSerializer {
  private static serializeApprovedBy(document: Document) {
    const approval = document.approvals?.find((entry) => entry.action === ApprovalAction.APPROVE)
    if (!approval?.approver) return null

    return {
      id: approval.approver.id,
      fullName: approval.approver.fullName,
      email: approval.approver.email,
      actedAt: approval.actedAt.toISO(),
    }
  }

  private static serializePrimaryFile(document: Document) {
    const file = document.files?.[0]
    if (!file) return null

    return {
      mimeType: file.mimeType,
      originalName: file.originalName,
    }
  }

  private static serializeLastEditedBy(document: Document) {
    const version = document.versions?.[0]
    if (!version?.createdBy) return null

    return {
      id: version.createdBy.id,
      fullName: version.createdBy.fullName,
      email: version.createdBy.email,
      editedAt: version.createdAt.toISO(),
    }
  }

  static serialize(document: Document) {
    const isPublic = document.visibility === DocumentVisibility.PUBLIC
    return {
      id: document.id,
      trackingNumber: document.trackingNumber,
      trackUrl: isPublic ? qrCodeService.buildTrackingUrl(document.trackingNumber) : null,
      title: document.title,
      description: document.description,
      status: document.status,
      priority: document.priority,
      visibility: document.visibility,
      sourceType: document.sourceType,
      hasContent: Boolean(document.contentHtml),
      documentTypeId: document.documentTypeId,
      departmentId: document.departmentId,
      assignedToId: document.assignedToId,
      originatingOfficeId: document.originatingOfficeId,
      receivingOfficeId: document.receivingOfficeId,
      documentDate: document.documentDate?.toISODate?.() ?? document.documentDate ?? null,
      receivedAt: document.receivedAt,
      subjectKeywords: document.subjectKeywords,
      confidentiality: document.confidentiality,
      legalHold: document.legalHold,
      legalHoldReason: document.legalHoldReason,
      legalHoldAt: document.legalHoldAt?.toISO() ?? null,
      napCategory: document.napCategory,
      retentionScheduleId: document.retentionScheduleId,
      lifecycleStatus: document.lifecycleStatus,
      retentionDueAt: document.retentionDueAt,
      dispositionAction: document.dispositionAction,
      receivingChannel: document.receivingChannel,
      filePlanNodeId: document.filePlanNodeId,
      qrCodeUrl: isPublic ? document.qrCodeUrl : null,
      metadata: document.metadata,
      submittedAt: document.submittedAt,
      completedAt: document.completedAt,
      archivedAt: document.archivedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      documentType: document.documentType
        ? {
            id: document.documentType.id,
            name: document.documentType.name,
            code: document.documentType.code,
          }
        : null,
      department: document.department
        ? {
            id: document.department.id,
            name: document.department.name,
            code: document.department.code,
          }
        : null,
      createdBy: document.createdBy
        ? {
            id: document.createdBy.id,
            fullName: document.createdBy.fullName,
            email: document.createdBy.email,
          }
        : null,
      lastEditedBy: this.serializeLastEditedBy(document),
      assignedTo: document.assignedTo
        ? {
            id: document.assignedTo.id,
            fullName: document.assignedTo.fullName,
            email: document.assignedTo.email,
          }
        : null,
      primaryFile: this.serializePrimaryFile(document),
    }
  }

  static serializeDetail(document: Document) {
    return {
      ...this.serialize(document),
      approvedBy: this.serializeApprovedBy(document),
      contentHtml: document.contentHtml,
    }
  }

  static serializeSummary(document: Document) {
    return this.serializeDetail(document)
  }

  static serializeDetailWithContent(document: Document) {
    return {
      ...this.serializeDetail(document),
      contentHtml: document.contentHtml,
    }
  }

  static serializePaginated(paginator: { all: () => Document[]; getMeta: () => unknown }) {
    return {
      data: paginator.all().map((doc) => this.serialize(doc)),
      meta: paginator.getMeta(),
    }
  }
}
