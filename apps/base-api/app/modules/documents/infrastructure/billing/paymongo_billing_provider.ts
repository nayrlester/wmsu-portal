import { createHmac, timingSafeEqual } from 'node:crypto'
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

const PAYMONGO_API = 'https://api.paymongo.com/v1'

function getSecretKey(): string {
  const key = env.get('PAYMONGO_SECRET_KEY')
  if (!key) {
    throw new BillingNotConfiguredException('PayMongo is not configured')
  }
  return key
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString('base64')}`
}

async function paymongoRequest<T>(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<T> {
  const response = await fetch(`${PAYMONGO_API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = (await response.json()) as { data?: T; errors?: Array<{ detail: string }> }
  if (!response.ok) {
    const detail = json.errors?.[0]?.detail ?? 'PayMongo request failed'
    throw new BillingNotConfiguredException(detail)
  }

  return json.data as T
}

export class PayMongoBillingProvider implements BillingProviderAdapter {
  readonly name = BillingProvider.PAYMONGO

  isConfigured(): boolean {
    return Boolean(env.get('PAYMONGO_SECRET_KEY'))
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

    const customer = await paymongoRequest<{ id: string }>('/customers', 'POST', {
      data: {
        attributes: {
          email: input.email,
          first_name: input.name,
          metadata: { tenantId: input.tenantId },
        },
      },
    })

    return customer.id
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
    customerId: string
  ): Promise<CheckoutSessionResult> {
    const amount = input.amountCents
    const link = await paymongoRequest<{ id: string; attributes: { checkout_url: string } }>(
      '/links',
      'POST',
      {
        data: {
          attributes: {
            amount,
            currency: input.currency.toUpperCase(),
            description: `${input.planName} (${input.billingCycle})`,
            remarks: input.planSlug,
            metadata: {
              ...input.metadata,
              customerId,
              billingCycle: input.billingCycle,
            },
            redirect: {
              success: input.successUrl,
              failed: input.cancelUrl,
            },
          },
        },
      }
    )

    return {
      sessionId: link.id,
      checkoutUrl: link.attributes.checkout_url,
      provider: BillingProvider.PAYMONGO,
    }
  }

  async updateSubscription(_input: ProviderSubscriptionUpdate): Promise<void> {
    throw new BillingNotConfiguredException(
      'PayMongo plan changes require creating a new subscription link'
    )
  }

  async cancelSubscription(_providerSubscriptionId: string, _atPeriodEnd: boolean): Promise<void> {
    return
  }

  async verifyWebhook(rawBody: string, signature: string | undefined): Promise<ParsedWebhookEvent> {
    const webhookSecret = env.get('PAYMONGO_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new BillingNotConfiguredException('PayMongo webhook secret is not configured')
    }

    if (!signature) {
      throw new WebhookVerificationException('Missing PayMongo signature header')
    }

    const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
    const received = signature.replace(/^sha256=/, '')

    const expectedBuffer = Buffer.from(expected)
    const receivedBuffer = Buffer.from(received)
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new WebhookVerificationException()
    }

    const payload = JSON.parse(rawBody) as {
      data: { id: string; attributes: { type: string; data?: Record<string, unknown> } }
    }

    return {
      id: payload.data.id,
      type: payload.data.attributes.type,
      provider: BillingProvider.PAYMONGO,
      payload: (payload.data.attributes.data ?? payload.data.attributes) as Record<string, unknown>,
    }
  }
}

export const paymongoBillingProvider = new PayMongoBillingProvider()
