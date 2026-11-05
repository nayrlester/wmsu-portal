import { DateTime } from 'luxon'
import DocumentIntelligenceJob from '#modules/documents/models/document_intelligence_job'
import { UsageMetric } from '#modules/documents/domain/enums/index'
import { planLimitService } from '#modules/documents/services/plan_limit_service'
import { billingRepository } from '#infrastructure/repositories/billing_repository'

export class UsageTrackingService {
  async recordSnapshot(tenantId: string) {
    const usage = await planLimitService.getUsage(tenantId)
    const periodStart = DateTime.now().startOf('month')
    const periodEnd = DateTime.now().endOf('month')

    const [ocrJobs, aiJobs] = await Promise.all([
      DocumentIntelligenceJob.query()
        .where('tenant_id', tenantId)
        .where('created_at', '>=', periodStart.toSQL()!)
        .count('* as total'),
      DocumentIntelligenceJob.query()
        .where('tenant_id', tenantId)
        .whereNotNull('result')
        .where('created_at', '>=', periodStart.toSQL()!)
        .count('* as total'),
    ])

    const metrics = [
      { metric: UsageMetric.USERS, quantity: usage.users },
      { metric: UsageMetric.DOCUMENTS, quantity: usage.documents },
      { metric: UsageMetric.STORAGE_BYTES, quantity: usage.storageBytes },
      { metric: UsageMetric.OCR_JOBS, quantity: Number(ocrJobs[0]?.$extras.total ?? 0) },
      { metric: UsageMetric.AI_JOBS, quantity: Number(aiJobs[0]?.$extras.total ?? 0) },
    ]

    await Promise.all(
      metrics.map((entry) =>
        billingRepository.recordUsage({
          tenantId,
          metric: entry.metric,
          quantity: entry.quantity,
          periodStart,
          periodEnd,
          metadata: { source: 'snapshot' },
        })
      )
    )

    return metrics
  }

  async getLatestMetrics(tenantId: string) {
    const metrics = Object.values(UsageMetric)
    const records = await Promise.all(
      metrics.map(async (metric) => ({
        metric,
        record: await billingRepository.latestUsage(tenantId, metric),
      }))
    )

    return records
      .filter((entry) => entry.record)
      .map((entry) => ({
        metric: entry.metric,
        quantity: Number(entry.record!.quantity),
        periodStart: entry.record!.periodStart,
        periodEnd: entry.record!.periodEnd,
        recordedAt: entry.record!.recordedAt,
      }))
  }

  async getUsageReport(tenantId: string) {
    const [live, history] = await Promise.all([
      planLimitService.getUsageWithLimits(tenantId),
      this.getLatestMetrics(tenantId),
    ])

    return {
      ...live,
      history,
      recordedAt: DateTime.now().toISO(),
    }
  }
}

export const usageTrackingService = new UsageTrackingService()
