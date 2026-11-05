import Document from '#modules/documents/models/document'
import { documentService } from '#modules/documents/services/document_service'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { DocumentSerializer } from '#presentation/documents/document_serializer'
import { DocumentConfidentialityPolicy } from '#modules/documents/domain/documents/document_confidentiality_policy'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { udmsFilePlanService } from '#modules/documents/services/udms/udms_file_plan_service'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction, ReceivingChannel } from '#modules/documents/domain/enums/index'
import type User from '#modules/documents/models/user'
import type {
  CreateDocumentDto,
  DocumentListFilters,
  UpdateDocumentDto,
} from '#modules/documents/domain/documents/document_dto'

export class UdmsRepositoryService {
  async register(
    input: {
      title: string
      description?: string
      documentTypeId: string
      documentDate: string
      subjectKeywords: string
      originatingOfficeId: string
      receivingOfficeId: string
      napCategory: string
      retentionScheduleId?: string
      confidentiality?: string
      receivingChannel?: string
      departmentId?: string
      filePlanNodeId?: string
      priority?: string
      visibility?: string
      metadata?: Record<string, unknown>
      contentHtml?: string
    },
    user: User
  ) {
    await udmsFilePlanService.assertNode(input.filePlanNodeId)

    const dto: CreateDocumentDto = {
      title: input.title,
      description: input.description,
      documentTypeId: input.documentTypeId,
      documentDate: input.documentDate,
      subjectKeywords: input.subjectKeywords,
      originatingOfficeId: input.originatingOfficeId,
      receivingOfficeId: input.receivingOfficeId,
      napCategory: input.napCategory,
      retentionScheduleId: input.retentionScheduleId,
      confidentiality: input.confidentiality,
      departmentId: input.departmentId ?? input.receivingOfficeId,
      priority: input.priority,
      visibility: input.visibility,
      metadata: input.metadata,
      contentHtml: input.contentHtml,
    }

    const document = await documentService.create(dto, user.id)

    document.receivingChannel =
      (input.receivingChannel as ReceivingChannel | undefined) ?? ReceivingChannel.INTERNAL
    if (input.filePlanNodeId) {
      document.filePlanNodeId = input.filePlanNodeId
    }
    await document.save()

    await auditService.log({
      tenantId: document.tenantId,
      userId: user.id,
      action: AuditAction.CREATE,
      entityType: 'document',
      entityId: document.id,
      newValues: {
        trackingNumber: document.trackingNumber,
        title: document.title,
        napCategory: document.napCategory,
        originatingOfficeId: document.originatingOfficeId,
        receivingOfficeId: document.receivingOfficeId,
        filePlanNodeId: document.filePlanNodeId,
        registration: 'udms_repository',
      },
      metadata: { module: 'udms', prompt: '03', tor: 'DMS-013' },
    })

    return documentRepository.findByIdOrFail(document.id)
  }

  async list(
    filters: {
      page?: number
      limit?: number
      search?: string
      trackingNumber?: string
      departmentId?: string
      documentTypeId?: string
      originatingOfficeId?: string
      receivingOfficeId?: string
      napCategory?: string
      confidentiality?: string
      filePlanNodeId?: string
      status?: string
    },
    userId: string
  ) {
    const listFilters: DocumentListFilters = {
      page: filters.page ?? 1,
      limit: filters.limit ?? 25,
      search: filters.trackingNumber?.trim() || filters.search,
      departmentId: filters.departmentId,
      documentTypeId: filters.documentTypeId,
      napCategory: filters.napCategory,
      confidentiality: filters.confidentiality,
      status: filters.status,
      filePlanNodeId: filters.filePlanNodeId,
      originatingOfficeId: filters.originatingOfficeId,
      receivingOfficeId: filters.receivingOfficeId,
    }
    return documentService.list(listFilters, userId)
  }

  async show(id: string, user: User) {
    const document = await documentService.findByIdFull(id, user.id)
    await DocumentConfidentialityPolicy.assertCanView(
      document,
      user,
      tenantContext.requireTenantId()
    )

    await auditService.log({
      tenantId: document.tenantId,
      userId: user.id,
      action: AuditAction.VIEW,
      entityType: 'document',
      entityId: document.id,
      metadata: {
        module: 'udms',
        prompt: '03',
        trackingNumber: document.trackingNumber,
      },
    })

    return document
  }

  async updateMetadata(id: string, input: UpdateDocumentDto & { filePlanNodeId?: string | null; receivingChannel?: string | null }, user: User) {
    if (input.filePlanNodeId !== undefined && input.filePlanNodeId !== null) {
      await udmsFilePlanService.assertNode(input.filePlanNodeId)
    }

    const document = await documentService.update(id, input, user.id)

    if (input.filePlanNodeId !== undefined) {
      document.filePlanNodeId = input.filePlanNodeId
    }
    if (input.receivingChannel !== undefined) {
      document.receivingChannel = input.receivingChannel
    }
    if (input.filePlanNodeId !== undefined || input.receivingChannel !== undefined) {
      await document.save()
    }

    return documentRepository.findByIdOrFail(document.id, user.id)
  }

  serialize(document: Document) {
    return DocumentSerializer.serializeDetail(document)
  }

  serializePage(page: Awaited<ReturnType<typeof documentService.list>>) {
    return DocumentSerializer.serializePaginated(page)
  }
}

export const udmsRepositoryService = new UdmsRepositoryService()
