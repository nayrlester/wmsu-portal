import BillingCustomer from '#modules/documents/models/billing_customer'
import BillingWebhookEvent from '#modules/documents/models/billing_webhook_event'
import Invoice from '#modules/documents/models/invoice'
import Coupon from '#modules/documents/models/coupon'
import UsageRecord from '#modules/documents/models/usage_record'
import { DateTime } from 'luxon'

export class BillingRepository {
  async findCustomer(tenantId: string, provider: string): Promise<BillingCustomer | null> {
    return BillingCustomer.query().where('tenant_id', tenantId).where('provider', provider).first()
  }

  async upsertCustomer(input: {
    tenantId: string
    provider: string
    providerCustomerId: string
    billingEmail?: string | null
  }): Promise<BillingCustomer> {
    const existing = await this.findCustomer(input.tenantId, input.provider)
    if (existing) {
      existing.merge({
        providerCustomerId: input.providerCustomerId,
        billingEmail: input.billingEmail ?? existing.billingEmail,
      })
      await existing.save()
      return existing
    }

    return BillingCustomer.create({
      tenantId: input.tenantId,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
      billingEmail: input.billingEmail ?? null,
    })
  }

  async markWebhookProcessed(provider: string, eventId: string, eventType: string, payload: Record<string, unknown>) {
    const existing = await BillingWebhookEvent.query()
      .where('provider', provider)
      .where('event_id', eventId)
      .first()

    if (existing?.processedAt) {
      return { duplicate: true, event: existing }
    }

    if (existing) {
      existing.processedAt = DateTime.now()
      await existing.save()
      return { duplicate: false, event: existing }
    }

    const event = await BillingWebhookEvent.create({
      provider,
      eventId,
      eventType,
      payload,
      processedAt: DateTime.now(),
    })

    return { duplicate: false, event }
  }

  async listInvoices(tenantId: string, page = 1, limit = 20) {
    return Invoice.query()
      .where('tenant_id', tenantId)
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }

  async findInvoiceForTenant(tenantId: string, invoiceId: string) {
    return Invoice.query().where('tenant_id', tenantId).where('id', invoiceId).first()
  }

  async findCouponByCode(code: string) {
    return Coupon.query().whereRaw('LOWER(code) = ?', [code.toLowerCase()]).first()
  }

  async recordUsage(input: {
    tenantId: string
    metric: string
    quantity: number
    periodStart: DateTime
    periodEnd: DateTime
    metadata?: Record<string, unknown> | null
  }) {
    return UsageRecord.create({
      tenantId: input.tenantId,
      metric: input.metric,
      quantity: input.quantity,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      metadata: input.metadata ?? null,
      recordedAt: DateTime.now(),
    })
  }

  async latestUsage(tenantId: string, metric: string) {
    return UsageRecord.query()
      .where('tenant_id', tenantId)
      .where('metric', metric)
      .orderBy('recorded_at', 'desc')
      .first()
  }
}

export const billingRepository = new BillingRepository()
