import type { HttpContext } from '@adonisjs/core/http'
import Document from '#modules/documents/models/document'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DocumentStatus } from '#modules/documents/domain/enums/index'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { dashboardAnalyticsService } from '#modules/documents/services/dashboard_analytics_service'
import { planLimitService } from '#modules/documents/services/plan_limit_service'

async function statusCounts(tenantId: string): Promise<Record<string, number>> {
  const rows = await Document.query()
    .where('tenant_id', tenantId)
    .whereNull('deleted_at')
    .select('status')
    .count('* as total')
    .groupBy('status')

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = Number(row.$extras.total ?? 0)
    return acc
  }, {})
}

function sumStatuses(counts: Record<string, number>, statuses: string[]) {
  return statuses.reduce((total, status) => total + (counts[status] ?? 0), 0)
}

export default class DashboardController {
  async stats({ response }: HttpContext) {
    const tenantId = tenantContext.requireTenantId()
    const counts = await statusCounts(tenantId)
    const pendingStatuses = [
      DocumentStatus.PENDING_REVIEW,
      DocumentStatus.PENDING_APPROVAL,
      DocumentStatus.SUBMITTED,
      DocumentStatus.RECEIVED,
    ]
    const overdueStatuses = [DocumentStatus.PENDING_REVIEW, DocumentStatus.PENDING_APPROVAL]

    return response.ok({
      totalDocuments: Object.values(counts).reduce((t, c) => t + c, 0),
      pendingDocuments: sumStatuses(counts, pendingStatuses),
      approvedDocuments: counts[DocumentStatus.APPROVED] ?? 0,
      rejectedDocuments: counts[DocumentStatus.REJECTED] ?? 0,
      overdueDocuments: sumStatuses(counts, overdueStatuses),
      records: { total: 0, active: 0, archived: 0 },
    })
  }

  async trend({ request, response }: HttpContext) {
    const months = Math.min(Math.max(Number(request.input('months', 6)), 1), 12)
    const monthly = await documentRepository.countCreatedByMonth(months)
    return response.ok({ monthly })
  }

  async usageTrend({ request, response }: HttpContext) {
    const months = Math.min(Math.max(Number(request.input('months', 6)), 1), 12)
    const tenantId = tenantContext.requireTenantId()
    const report = await planLimitService.getUsageTrend(tenantId, months)
    return response.ok(report)
  }

  async filesTrend({ request, response }: HttpContext) {
    const days = Math.min(Math.max(Number(request.input('days', 30)), 1), 90)
    const daily = await dashboardAnalyticsService.getFilesTrend(days)
    return response.ok({ daily })
  }

  async userAccess({ response }: HttpContext) {
    const access = await dashboardAnalyticsService.getUserAccess()
    return response.ok(access)
  }

  async overview({ request, auth, response }: HttpContext) {
    const months = Math.min(Math.max(Number(request.input('months', 6)), 1), 12)
    const tenantId = tenantContext.requireTenantId()
    const userId = auth.user!.id

    const counts = await statusCounts(tenantId)
    const pendingStatuses = [
      DocumentStatus.PENDING_REVIEW,
      DocumentStatus.PENDING_APPROVAL,
      DocumentStatus.SUBMITTED,
      DocumentStatus.RECEIVED,
    ]

    const recent = await Document.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .orderBy('updated_at', 'desc')
      .limit(10)

    const pendingApprovalsCount = sumStatuses(counts, [
      DocumentStatus.PENDING_REVIEW,
      DocumentStatus.PENDING_APPROVAL,
    ])

    return response.ok({
      stats: {
        totalDocuments: Object.values(counts).reduce((t, c) => t + c, 0),
        pendingDocuments: sumStatuses(counts, pendingStatuses),
        approvedDocuments: counts[DocumentStatus.APPROVED] ?? 0,
        rejectedDocuments: counts[DocumentStatus.REJECTED] ?? 0,
        overdueDocuments: sumStatuses(counts, [
          DocumentStatus.PENDING_REVIEW,
          DocumentStatus.PENDING_APPROVAL,
        ]),
        records: { total: 0, active: 0, archived: 0 },
      },
      recentDocuments: recent.map((doc) => ({
        id: doc.id,
        title: doc.title,
        trackingNumber: doc.trackingNumber,
        status: doc.status,
        updatedAt: doc.updatedAt,
      })),
      pendingApprovalsCount,
      months,
    })
  }
}
