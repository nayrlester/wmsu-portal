import type { BillingCycle, BillingProvider } from '#modules/documents/domain/enums/index'

export interface CheckoutSessionInput {
  tenantId: string
  tenantSlug: string
  tenantName: string
  customerEmail: string
  planSlug: string
  planName: string
  billingCycle: BillingCycle
  amountCents: number
  currency: string
  providerPriceId: string | null
  couponCode?: string
  successUrl: string
  cancelUrl: string
  metadata: Record<string, string>
}

export interface CheckoutSessionResult {
  sessionId: string
  checkoutUrl: string
  provider: BillingProvider
  expiresAt?: string
}

export interface ProviderSubscriptionUpdate {
  providerSubscriptionId: string
  planPriceId: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

export interface ParsedWebhookEvent {
  id: string
  type: string
  provider: BillingProvider
  payload: Record<string, unknown>
}

export interface SubscriptionSyncPayload {
  tenantId: string
  provider: BillingProvider
  providerSubscriptionId: string
  providerCustomerId: string
  planSlug: string
  billingCycle: BillingCycle
  status: string
  trialEndsAt?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelledAt?: string | null
}

export interface InvoiceSyncPayload {
  tenantId: string
  subscriptionId?: string | null
  provider: BillingProvider
  providerInvoiceId: string
  invoiceNumber: string
  amount: number
  taxAmount: number
  currency: string
  status: string
  dueDate?: string | null
  paidAt?: string | null
  pdfUrl?: string | null
  lineItems: Array<{ description: string; amount: number; quantity: number }>
}

export const PLAN_RANK: Record<string, number> = {
  starter: 1,
  business: 2,
  enterprise: 3,
}
