import Stripe from 'stripe'
import env from '#start/env'
import { BillingProvider } from '#modules/documents/domain/enums/index'
import type { BillingProviderAdapter } from '#modules/documents/domain/billing/billing_provider'
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  ParsedWebhookEvent,
  ProviderSubscriptionUpdate,
} from '#modules/documents/domain/billing/billing_types'
import { BillingNotConfiguredException, WebhookVerificationException } from '#modules/documents/domain/exceptions/billing_exceptions'

let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  const secretKey = env.get('STRIPE_SECRET_KEY')
  if (!secretKey) {
    throw new BillingNotConfiguredException('Stripe is not configured')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}

export class StripeBillingProvider implements BillingProviderAdapter {
  readonly name = BillingProvider.STRIPE

  isConfigured(): boolean {
    return Boolean(env.get('STRIPE_SECRET_KEY'))
  }

  async ensureCustomer(input: {
    tenantId: string
    email: string
    name: string
    existingCustomerId?: string | null
  }): Promise<string> {
    if (input.existingCustomerId) {
      return input.existingCustomerId
    }

    const stripe = getStripe()
    const customer = await stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: { tenantId: input.tenantId },
    })

    return customer.id
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
    customerId: string
  ): Promise<CheckoutSessionResult> {
    const stripe = getStripe()

    if (!input.providerPriceId) {
      throw new BillingNotConfiguredException('Stripe price ID is not configured for this plan')
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: input.providerPriceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      subscription_data: {
        metadata: input.metadata,
        trial_period_days: input.metadata.trialDays ? Number(input.metadata.trialDays) : undefined,
      },
      metadata: input.metadata,
      allow_promotion_codes: true,
    })

    if (!session.url) {
      throw new BillingNotConfiguredException('Stripe checkout session URL was not returned')
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      provider: BillingProvider.STRIPE,
    }
  }

  async updateSubscription(input: ProviderSubscriptionUpdate): Promise<void> {
    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(input.providerSubscriptionId)
    const itemId = subscription.items.data[0]?.id

    if (!itemId) {
      throw new BillingNotConfiguredException('Stripe subscription has no line items')
    }

    await stripe.subscriptions.update(input.providerSubscriptionId, {
      items: [{ id: itemId, price: input.planPriceId }],
      proration_behavior: input.prorationBehavior ?? 'create_prorations',
    })
  }

  async cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    const stripe = getStripe()

    if (atPeriodEnd) {
      await stripe.subscriptions.update(providerSubscriptionId, { cancel_at_period_end: true })
      return
    }

    await stripe.subscriptions.cancel(providerSubscriptionId)
  }

  async verifyWebhook(rawBody: string, signature: string | undefined): Promise<ParsedWebhookEvent> {
    const webhookSecret = env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new BillingNotConfiguredException('Stripe webhook secret is not configured')
    }

    if (!signature) {
      throw new WebhookVerificationException('Missing Stripe signature header')
    }

    try {
      const stripe = getStripe()
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      return {
        id: event.id,
        type: event.type,
        provider: BillingProvider.STRIPE,
        payload: event.data.object as unknown as Record<string, unknown>,
      }
    } catch {
      throw new WebhookVerificationException()
    }
  }
}

export const stripeBillingProvider = new StripeBillingProvider()
