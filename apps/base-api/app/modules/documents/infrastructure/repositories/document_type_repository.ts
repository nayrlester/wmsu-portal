import { DateTime } from 'luxon'
import DocumentType from '#modules/documents/models/document_type'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export interface CreateDocumentTypeData {
  tenantId: string
  name: string
  code: string
  description: string | null
  isActive: boolean
  createdById: string
}

export class DocumentTypeRepository {
  async listActive() {
    const tenantId = tenantContext.requireTenantId()
    return DocumentType.query()
      .where('tenant_id', tenantId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('name')
  }

  async listAll() {
    const tenantId = tenantContext.requireTenantId()
    return DocumentType.query().where('tenant_id', tenantId).whereNull('deleted_at').orderBy('name')
  }

  async findInTenant(id: string): Promise<DocumentType | null> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentType.query()
      .where('id', id)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .first()
  }

  async findByCode(code: string, excludeId?: string): Promise<DocumentType | null> {
    const tenantId = tenantContext.requireTenantId()
    const query = DocumentType.query()
      .where('tenant_id', tenantId)
      .where('code', code)
      .whereNull('deleted_at')

    if (excludeId) {
      query.whereNot('id', excludeId)
    }

    return query.first()
  }

  async create(data: CreateDocumentTypeData): Promise<DocumentType> {
    return DocumentType.create({
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      isActive: data.isActive,
      createdById: data.createdById,
      updatedById: data.createdById,
    })
  }

  async save(documentType: DocumentType): Promise<DocumentType> {
    await documentType.save()
    return documentType
  }

  async softDelete(documentType: DocumentType, userId: string): Promise<void> {
    documentType.isActive = false
    documentType.deletedAt = DateTime.now()
    documentType.updatedById = userId
    await documentType.save()
  }
}

export const documentTypeRepository = new DocumentTypeRepository()
