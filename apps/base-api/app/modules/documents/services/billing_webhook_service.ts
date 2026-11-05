import { DateTime } from 'luxon'
import Payment from '#modules/documents/models/payment'
import { BillingProvider, PaymentStatus, SubscriptionStatus } from '#modules/documents/domain/enums/index'
import type { ParsedWebhookEvent } from '#modules/documents/domain/billing/billing_types'
import { billingRepository } from '#infrastructure/repositories/billing_repository'
import { billingService } from '#modules/documents/services/billing_service'
import { invoiceService } from '#modules/documents/services/invoice_service'
import Subscription from '#modules/documents/models/subscription'
import Tenant from '#modules/documents/models/tenant'
import { TenantStatus } from '#modules/documents/domain/enums/index'

export class BillingWebhookService {
  async handle(event: ParsedWebhookEvent) {
    const { duplicate } = await billingRepository.markWebhookProcessed(
      event.provider,
      event.id,
      event.type,
      event.payload
    )

    if (duplicate) {
      return { processed: false, duplicate: true }
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event)
        break
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event)
        break
      case 'customer.subscription.deleted':
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(event)
        break
      case 'link.payment.paid':
        await this.handlePayMongoPayment(event)
        break
      default:
        break
    }

    return { processed: true, duplicate: false }
  }

  private async handleCheckoutCompleted(event: ParsedWebhookEvent) {
    const object = event.payload as Record<string, unknown>
    const metadata = (object.metadata ?? {}) as Record<string, string>
    const subscriptionId = String(object.subscription ?? object.id ?? '')
    const tenantId = metadata.tenantId

    if (!tenantId) return

    await billingService.activateFromCheckout(metadata, event.provider, subscriptionId)
  }

  private async handleInvoicePaid(event: ParsedWebhookEvent) {
    const object = event.payload as Record<string, unknown>
    const metadata = (object.metadata ?? {}) as Record<string, string>
    const tenantId = metadata.tenantId

    if (!tenantId) return

    const amount = Number(object.amount_paid ?? object.amount ?? 0) / (event.provider === BillingProvider.STRIPE ? 100 : 1)

    await invoiceService.syncFromProvider({
      tenantId,
      provider: event.provider,
      providerInvoiceId: String(object.id ?? event.id),
      invoiceNumber: String(object.number ?? (await invoiceService.generateInvoiceNumber())),
      amount,
      taxAmount: 0,
      currency: String(object.currency ?? 'usd').toUpperCase(),
      status: 'paid',
      paidAt: DateTime.now().toISO(),
      lineItems: [],
    })

    await Payment.create({
      tenantId,
      subscriptionId: null,
      amount,
      currency: String(object.currency ?? 'usd').toUpperCase(),
      status: PaymentStatus.SUCCEEDED,
      provider: event.provider,
      providerPaymentId: String(object.payment_intent ?? object.id ?? event.id),
      paidAt: DateTime.now(),
      metadata: { eventType: event.type },
    })
  }

  private async handleSubscriptionCancelled(event: ParsedWebhookEvent) {
    const object = event.payload as Record<string, unknown>
    const metadata = (object.metadata ?? {}) as Record<string, string>
    let tenantId = metadata.tenantId

    if (!tenantId) {
      const providerSubId = String(object.id ?? '')
      const subscription = await Subscription.query()
        .where('stripe_subscription_id', providerSubId)
        .orWhere('paymongo_subscription_id', providerSubId)
        .first()
      tenantId = subscription?.tenantId
    }

    if (!tenantId) return

    const subscription = await Subscription.query()
      .where('tenant_id', tenantId)
      .whereIn('status', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE])
      .orderBy('created_at', 'desc')
      .first()

    if (!subscription) return

    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancelledAt = DateTime.now()
    await subscription.save()

    await Tenant.query().where('id', tenantId).update({ status: TenantStatus.CANCELLED })
  }

  private async handlePayMongoPayment(event: ParsedWebhookEvent) {
    const object = event.payload as Record<string, unknown>
    const metadata = (object.metadata ?? {}) as Record<string, string>

    if (!metadata.tenantId) return

    await billingService.activateFromCheckout(
      metadata,
      BillingProvider.PAYMONGO,
      String(object.id ?? event.id)
    )
  }
}

export const billingWebhookService = new BillingWebhookService()
