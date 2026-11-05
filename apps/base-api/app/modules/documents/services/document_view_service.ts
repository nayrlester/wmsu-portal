import { DateTime } from 'luxon'
import DocumentView from '#modules/documents/models/document_view'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { dashboardAnalyticsService } from '#modules/documents/services/dashboard_analytics_service'

export class DocumentViewService {
  async logView(documentId: string, userId: string) {
    const tenantId = tenantContext.requireTenantId()
    await documentRepository.findByIdOrFail(documentId, userId)

    const recent = await DocumentView.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .where('user_id', userId)
      .where('viewed_at', '>=', DateTime.now().minus({ minutes: 5 }).toSQL()!)
      .first()

    if (recent) return

    await DocumentView.create({
      tenantId,
      documentId,
      userId,
      viewedAt: DateTime.now(),
    })

    await dashboardAnalyticsService.invalidateCache(tenantId)
  }
}

export const documentViewService = new DocumentViewService()
