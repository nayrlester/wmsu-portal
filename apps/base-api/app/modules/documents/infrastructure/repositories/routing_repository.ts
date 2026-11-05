import { DateTime } from 'luxon'
import RoutingEntry from '#modules/documents/models/routing_entry'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { DocumentNotFoundException } from '#modules/documents/domain/documents/document_exceptions'

export class RoutingRepository {
  async listByDocument(documentId: string): Promise<RoutingEntry[]> {
    const tenantId = tenantContext.requireTenantId()
    const exists = await documentRepository.exists(documentId)
    if (!exists) {
      throw new DocumentNotFoundException()
    }

    return this.listByDocumentForTenant(documentId, tenantId)
  }

  async listByDocumentForTenant(documentId: string, tenantId: string): Promise<RoutingEntry[]> {
    return RoutingEntry.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .preload('fromUser')
      .preload('toUser')
      .preload('fromDepartment')
      .preload('toDepartment')
      .orderBy('routed_at', 'desc')
  }

  async create(data: {
    tenantId: string
    documentId: string
    fromUserId?: string | null
    toUserId?: string | null
    fromDepartmentId?: string | null
    toDepartmentId?: string | null
    action: string
    remarks?: string | null
  }): Promise<RoutingEntry> {
    return RoutingEntry.create({
      tenantId: data.tenantId,
      documentId: data.documentId,
      fromUserId: data.fromUserId ?? null,
      toUserId: data.toUserId ?? null,
      fromDepartmentId: data.fromDepartmentId ?? null,
      toDepartmentId: data.toDepartmentId ?? null,
      action: data.action,
      remarks: data.remarks ?? null,
      routedAt: DateTime.now(),
    })
  }
}

export const routingRepository = new RoutingRepository()
