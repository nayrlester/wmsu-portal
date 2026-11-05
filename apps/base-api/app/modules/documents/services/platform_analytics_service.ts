import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'
import Subscription from '#modules/documents/models/subscription'
import Plan from '#modules/documents/models/plan'
import User from '#modules/documents/models/user'
import Document from '#modules/documents/models/document'
import DocumentFile from '#modules/documents/models/document_file'
import Payment from '#modules/documents/models/payment'
import Invoice from '#modules/documents/models/invoice'
import { SubscriptionStatus, TenantStatus, InvoiceStatus, PaymentStatus } from '#modules/documents/domain/enums/index'
import type {
  BillingOverview,
  MonthlyRevenuePoint,
  PlatformOverviewMetrics,
  RevenueByPlan,
  TenantUsageRow,
} from '#modules/documents/domain/analytics/analytics_types'

export class PlatformAnalyticsService {
  resolveMonthlyRevenue(monthlyPrice: number, annualPrice: number, billingCycle: string): number {
    if (billingCycle === 'annual') {
      return Number(annualPrice) / 12
    }
    return Number(monthlyPrice)
  }

  async getOverview(): Promise<PlatformOverviewMetrics> {
    const now = DateTime.now()
    const periodStart = now.startOf('month')
    const periodEnd = now.endOf('month')

    const [
      tenantCounts,
      storageResult,
      activeSubscriptions,
      cancelledThisMonth,
      activeAtMonthStart,
    ] = await Promise.all([
      this.countTenantsByStatus(),
      DocumentFile.query().sum('file_size as total'),
      Subscription.query()
        .whereIn('status', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])
        .whereNull('deleted_at')
        .preload('plan'),
      Subscription.query()
        .where('status', SubscriptionStatus.CANCELLED)
        .where('cancelled_at', '>=', periodStart.toSQL()!)
        .whereNull('deleted_at')
        .count('* as total'),
      Subscription.query()
        .whereIn('status', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])
        .where('created_at', '<', periodStart.toSQL()!)
        .whereNull('deleted_at')
        .count('* as total'),
    ])

    let mrr = 0
    for (const sub of activeSubscriptions) {
      if (sub.status !== SubscriptionStatus.ACTIVE || !sub.plan) continue
      mrr += this.resolveMonthlyRevenue(
        Number(sub.plan.monthlyPrice),
        Number(sub.plan.annualPrice),
        sub.billingCycle
      )
    }

    const cancelledCount = Number(cancelledThisMonth[0]?.$extras.total ?? 0)
    const activeStartCount = Number(activeAtMonthStart[0]?.$extras.total ?? 0)
    const churnRate =
      activeStartCount > 0 ? Math.round((cancelledCount / activeStartCount) * 10000) / 100 : 0

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      churnRate,
      activeTenants: tenantCounts.active,
      trialingTenants: tenantCounts.trialing,
      suspendedTenants: tenantCounts.suspended,
      totalTenants: tenantCounts.total,
      storageBytes: Number(storageResult[0]?.$extras.total ?? 0),
      currency: 'USD',
      periodStart: periodStart.toISO()!,
      periodEnd: periodEnd.toISO()!,
    }
  }

  async getRevenueByPlan(): Promise<RevenueByPlan[]> {
    const subscriptions = await Subscription.query()
      .whereIn('status', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])
      .whereNull('deleted_at')
      .preload('plan')

    const byPlan = new Map<string, RevenueByPlan>()

    for (const sub of subscriptions) {
      if (!sub.plan) continue
      const key = sub.plan.slug
      const existing = byPlan.get(key) ?? {
        planSlug: sub.plan.slug,
        planName: sub.plan.name,
        tenantCount: 0,
        mrr: 0,
      }

      existing.tenantCount += 1
      if (sub.status === SubscriptionStatus.ACTIVE) {
        existing.mrr += this.resolveMonthlyRevenue(
          Number(sub.plan.monthlyPrice),
          Number(sub.plan.annualPrice),
          sub.billingCycle
        )
      }

      byPlan.set(key, existing)
    }

    return Array.from(byPlan.values())
      .map((row) => ({ ...row, mrr: Math.round(row.mrr * 100) / 100 }))
      .sort((a, b) => b.mrr - a.mrr)
  }

  async getMonthlyRevenue(months = 6): Promise<MonthlyRevenuePoint[]> {
    const start = DateTime.now().minus({ months: months - 1 }).startOf('month')
    const payments = await Payment.query()
      .where('status', PaymentStatus.SUCCEEDED)
      .where('paid_at', '>=', start.toSQL()!)
      .orderBy('paid_at', 'asc')

    const buckets = new Map<string, MonthlyRevenuePoint>()
    for (let i = 0; i < months; i++) {
      const month = start.plus({ months: i }).toFormat('yyyy-MM')
      buckets.set(month, { month, revenue: 0, payments: 0 })
    }

    for (const payment of payments) {
      if (!payment.paidAt) continue
      const month = payment.paidAt.toFormat('yyyy-MM')
      const bucket = buckets.get(month)
      if (!bucket) continue
      bucket.revenue += Number(payment.amount)
      bucket.payments += 1
    }

    return Array.from(buckets.values()).map((b) => ({
      ...b,
      revenue: Math.round(b.revenue * 100) / 100,
    }))
  }

  async getTenantUsage(page = 1, limit = 20): Promise<{ data: TenantUsageRow[]; meta: Record<string, unknown> }> {
    const paginator = await Tenant.query()
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .paginate(page, Math.min(limit, 100))

    const tenantIds = paginator.all().map((t) => t.id)

    const [subscriptions, userCounts, docCounts, storageByTenant] = await Promise.all([
      Subscription.query()
        .whereIn('tenant_id', tenantIds)
        .whereIn('status', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE])
        .whereNull('deleted_at')
        .preload('plan'),
      User.query()
        .whereIn('tenant_id', tenantIds)
        .whereNull('deleted_at')
        .groupBy('tenant_id')
        .select('tenant_id')
        .count('* as total'),
      Document.query()
        .whereIn('tenant_id', tenantIds)
        .whereNull('deleted_at')
        .groupBy('tenant_id')
        .select('tenant_id')
        .count('* as total'),
      DocumentFile.query()
        .whereIn('tenant_id', tenantIds)
        .groupBy('tenant_id')
        .select('tenant_id')
        .sum('file_size as total'),
    ])

    const subByTenant = new Map(subscriptions.map((s) => [s.tenantId, s]))
    const usersByTenant = new Map(userCounts.map((r) => [r.tenantId, Number(r.$extras.total)]))
    const docsByTenant = new Map(docCounts.map((r) => [r.tenantId, Number(r.$extras.total)]))
    const storageMap = new Map(storageByTenant.map((r) => [r.tenantId, Number(r.$extras.total ?? 0)]))

    const data = paginator.all().map((tenant) => {
      const sub = subByTenant.get(tenant.id)
      const plan = sub?.plan
      const mrr =
        sub?.status === SubscriptionStatus.ACTIVE && plan
          ? this.resolveMonthlyRevenue(
              Number(plan.monthlyPrice),
              Number(plan.annualPrice),
              sub.billingCycle
            )
          : 0

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        status: tenant.status,
        planSlug: plan?.slug ?? tenant.planTier,
        planName: plan?.name ?? null,
        subscriptionStatus: sub?.status ?? null,
        users: usersByTenant.get(tenant.id) ?? 0,
        documents: docsByTenant.get(tenant.id) ?? 0,
        storageBytes: storageMap.get(tenant.id) ?? 0,
        mrr: Math.round(mrr * 100) / 100,
      }
    })

    return { data, meta: paginator.getMeta() as Record<string, unknown> }
  }

  async getBillingOverview(): Promise<BillingOverview> {
    const now = DateTime.now()
    const monthStart = now.startOf('month')

    const [totalRevenueResult, monthRevenueResult, invoiceCounts, recentPayments, revenueByPlan] =
      await Promise.all([
        Payment.query().where('status', PaymentStatus.SUCCEEDED).sum('amount as total'),
        Payment.query()
          .where('status', PaymentStatus.SUCCEEDED)
          .where('paid_at', '>=', monthStart.toSQL()!)
          .sum('amount as total'),
        Invoice.query()
          .select('status')
          .count('* as total')
          .groupBy('status'),
        Payment.query()
          .where('status', PaymentStatus.SUCCEEDED)
          .orderBy('paid_at', 'desc')
          .limit(10),
        this.getRevenueByPlan(),
      ])

    const tenants = await Tenant.query().whereNull('deleted_at')
    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]))

    let outstandingInvoices = 0
    let paidInvoices = 0
    for (const row of invoiceCounts) {
      if (row.status === InvoiceStatus.PAID) paidInvoices = Number(row.$extras.total)
      if (row.status === InvoiceStatus.OPEN || row.status === InvoiceStatus.DRAFT) {
        outstandingInvoices += Number(row.$extras.total)
      }
    }

    return {
      totalRevenue: Math.round(Number(totalRevenueResult[0]?.$extras.total ?? 0) * 100) / 100,
      revenueThisMonth: Math.round(Number(monthRevenueResult[0]?.$extras.total ?? 0) * 100) / 100,
      outstandingInvoices,
      paidInvoices,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        tenantName: tenantMap.get(p.tenantId) ?? 'Unknown',
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt?.toISO() ?? null,
      })),
      revenueByPlan,
    }
  }

  private async countTenantsByStatus() {
    const rows = await Tenant.query()
      .whereNull('deleted_at')
      .select('status')
      .count('* as total')
      .groupBy('status')

    const counts = { active: 0, trialing: 0, suspended: 0, cancelled: 0, total: 0 }
    for (const row of rows) {
      const count = Number(row.$extras.total)
      counts.total += count
      if (row.status === TenantStatus.ACTIVE) counts.active = count
      if (row.status === TenantStatus.TRIALING) counts.trialing = count
      if (row.status === TenantStatus.SUSPENDED) counts.suspended = count
      if (row.status === TenantStatus.CANCELLED) counts.cancelled = count
    }
    return counts
  }
}

export const platformAnalyticsService = new PlatformAnalyticsService()
