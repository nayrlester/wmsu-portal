import { randomUUID } from 'node:crypto'
import { BillingProvider } from '#modules/documents/domain/enums/index'
import type { BillingProviderAdapter } from '#modules/documents/domain/billing/billing_provider'
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  ParsedWebhookEvent,
  ProviderSubscriptionUpdate,
} from '#modules/documents/domain/billing/billing_types'
import { WebhookVerificationException } from '#modules/documents/domain/exceptions/billing_exceptions'

const checkoutSessions = new Map<string, CheckoutSessionInput & { customerId: string }>()

export class StubBillingProvider implements BillingProviderAdapter {
  readonly name = BillingProvider.STUB

  isConfigured(): boolean {
    return true
  }

  async ensureCustomer(input: {
    tenantId: string
    email: string
    name: string
    existingCustomerId?: string | null
  }): Promise<string> {
    return input.existingCustomerId ?? `stub_cus_${input.tenantId}`
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
    customerId: string
  ): Promise<CheckoutSessionResult> {
    const sessionId = `stub_cs_${randomUUID()}`
    checkoutSessions.set(sessionId, { ...input, customerId })

    return {
      sessionId,
      checkoutUrl: `${input.successUrl}?session_id=${sessionId}&stub=1`,
      provider: BillingProvider.STUB,
    }
  }

  async updateSubscription(_input: ProviderSubscriptionUpdate): Promise<void> {
    return
  }

  async cancelSubscription(_providerSubscriptionId: string, _atPeriodEnd: boolean): Promise<void> {
    return
  }

  async verifyWebhook(rawBody: string, signature: string | undefined): Promise<ParsedWebhookEvent> {
    if (signature !== 'stub-valid') {
      throw new WebhookVerificationException()
    }

    const body = JSON.parse(rawBody) as {
      id?: string
      type?: string
      data?: { object?: Record<string, unknown> }
    }

    const object = body.data?.object ?? (body as Record<string, unknown>)

    return {
      id: String(body.id ?? randomUUID()),
      type: String(body.type ?? 'checkout.session.completed'),
      provider: BillingProvider.STUB,
      payload: object,
    }
  }

  getCheckoutSession(sessionId: string) {
    return checkoutSessions.get(sessionId)
  }

  buildCheckoutCompletedEvent(sessionId: string): Record<string, unknown> {
    const session = checkoutSessions.get(sessionId)
    if (!session) {
      throw new Error(`Unknown stub checkout session: ${sessionId}`)
    }

    return {
      id: `evt_${randomUUID()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          customer: session.customerId,
          subscription: `stub_sub_${randomUUID()}`,
          metadata: session.metadata,
          amount_total: session.amountCents,
          currency: session.currency,
        },
      },
    }
  }
}

export const stubBillingProvider = new StubBillingProvider()
