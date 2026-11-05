import type DocumentType from '#modules/documents/models/document_type'
import Document from '#modules/documents/models/document'
import { documentTypeRepository } from '#infrastructure/repositories/document_type_repository'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'
import {
  CatalogCodeAlreadyExistsException,
  CatalogEntityInUseException,
  CatalogEntityNotFoundException,
} from '#modules/documents/domain/exceptions/catalog_exceptions'

export interface CreateDocumentTypeInput {
  name: string
  code: string
  description?: string | null
  isActive?: boolean
}

export interface UpdateDocumentTypeInput {
  name?: string
  code?: string
  description?: string | null
  isActive?: boolean
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

export class DocumentTypeService {
  serialize(documentType: DocumentType) {
    return {
      id: documentType.id,
      name: documentType.name,
      code: documentType.code,
      description: documentType.description,
      isActive: documentType.isActive,
      createdAt: documentType.createdAt?.toISO() ?? null,
      updatedAt: documentType.updatedAt?.toISO() ?? null,
    }
  }

  async list() {
    return documentTypeRepository.listAll()
  }

  async findById(id: string): Promise<DocumentType> {
    const documentType = await documentTypeRepository.findInTenant(id)
    if (!documentType) {
      throw new CatalogEntityNotFoundException('Document type')
    }
    return documentType
  }

  private async assertUniqueCode(code: string, excludeId?: string) {
    const existing = await documentTypeRepository.findByCode(code, excludeId)
    if (existing) {
      throw new CatalogCodeAlreadyExistsException()
    }
  }

  async create(input: CreateDocumentTypeInput, userId: string): Promise<DocumentType> {
    const tenantId = tenantContext.requireTenantId()
    const code = normalizeCode(input.code)

    await this.assertUniqueCode(code)

    const documentType = await documentTypeRepository.create({
      tenantId,
      name: input.name.trim(),
      code,
      description: input.description?.trim() ?? null,
      isActive: input.isActive ?? true,
      createdById: userId,
    })

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'document_type',
      entityId: documentType.id,
      newValues: { name: documentType.name, code: documentType.code },
    })

    return documentType
  }

  async update(id: string, input: UpdateDocumentTypeInput, userId: string): Promise<DocumentType> {
    const documentType = await this.findById(id)
    const tenantId = documentType.tenantId
    const oldValues = {
      name: documentType.name,
      code: documentType.code,
      isActive: documentType.isActive,
    }

    if (input.name !== undefined) documentType.name = input.name.trim()
    if (input.description !== undefined) documentType.description = input.description?.trim() ?? null
    if (input.isActive !== undefined) documentType.isActive = input.isActive

    if (input.code !== undefined) {
      const code = normalizeCode(input.code)
      await this.assertUniqueCode(code, documentType.id)
      documentType.code = code
    }

    documentType.updatedById = userId
    await documentTypeRepository.save(documentType)

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'document_type',
      entityId: documentType.id,
      oldValues,
      newValues: input as Record<string, unknown>,
    })

    return documentType
  }

  private async assertCanDeactivate(documentTypeId: string) {
    const tenantId = tenantContext.requireTenantId()

    const documents = await Document.query()
      .where('tenant_id', tenantId)
      .where('document_type_id', documentTypeId)
      .whereNull('deleted_at')
      .count('* as total')

    const documentCount = Number(documents[0]?.$extras.total ?? 0)
    if (documentCount > 0) {
      throw new CatalogEntityInUseException(
        `Cannot deactivate: used by ${documentCount} document${documentCount === 1 ? '' : 's'}`
      )
    }
  }

  async deactivate(id: string, userId: string): Promise<void> {
    const documentType = await this.findById(id)
    await this.assertCanDeactivate(documentType.id)
    await documentTypeRepository.softDelete(documentType, userId)

    await auditService.log({
      tenantId: documentType.tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'document_type',
      entityId: documentType.id,
      oldValues: { name: documentType.name, code: documentType.code },
    })
  }
}

export const documentTypeService = new DocumentTypeService()
