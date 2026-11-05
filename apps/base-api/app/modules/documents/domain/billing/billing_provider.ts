import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  ParsedWebhookEvent,
  ProviderSubscriptionUpdate,
} from '#modules/documents/domain/billing/billing_types'
import type { BillingProvider } from '#modules/documents/domain/enums/index'

export interface BillingProviderAdapter {
  readonly name: BillingProvider

  isConfigured(): boolean

  ensureCustomer(input: {
    tenantId: string
    email: string
    name: string
    existingCustomerId?: string | null
  }): Promise<string>

  createCheckoutSession(input: CheckoutSessionInput, customerId: string): Promise<CheckoutSessionResult>

  updateSubscription(input: ProviderSubscriptionUpdate): Promise<void>

  cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void>

  verifyWebhook(rawBody: string, signature: string | undefined): Promise<ParsedWebhookEvent>
}
