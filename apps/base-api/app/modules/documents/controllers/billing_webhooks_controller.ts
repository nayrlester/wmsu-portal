import type { HttpContext } from '@adonisjs/core/http'
import { BillingProvider } from '#modules/documents/domain/enums/index'
import { WebhookVerificationException } from '#modules/documents/domain/exceptions/billing_exceptions'
import { getBillingProvider } from '#infrastructure/billing/provider_registry'
import { billingWebhookService } from '#modules/documents/services/billing_webhook_service'

export default class BillingWebhooksController {
  private rawBody(request: HttpContext['request']): string {
    const cached = request.billingRawBody
    if (cached) {
      return cached
    }

    const body = request.body()
    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      return JSON.stringify(body)
    }

    return JSON.stringify(body ?? {})
  }

  private async handleProvider(
    request: HttpContext['request'],
    response: HttpContext['response'],
    providerName: BillingProvider,
    signature: string | undefined
  ) {
    const provider = getBillingProvider(providerName)

    try {
      const event = await provider.verifyWebhook(this.rawBody(request), signature)
      const result = await billingWebhookService.handle(event)
      return response.ok(result)
    } catch (error) {
      if (error instanceof WebhookVerificationException) {
        return response.badRequest({ error: error.message })
      }
      throw error
    }
  }

  async stripe({ request, response }: HttpContext) {
    return this.handleProvider(request, response, BillingProvider.STRIPE, request.header('stripe-signature'))
  }

  async paymongo({ request, response }: HttpContext) {
    return this.handleProvider(
      request,
      response,
      BillingProvider.PAYMONGO,
      request.header('paymongo-signature')
    )
  }

  async stub({ request, response }: HttpContext) {
    return this.handleProvider(
      request,
      response,
      BillingProvider.STUB,
      request.header('x-billing-signature')
    )
  }
}
