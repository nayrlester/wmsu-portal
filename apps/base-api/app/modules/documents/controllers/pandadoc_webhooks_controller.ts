import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { pandadocClient } from '#infrastructure/pandadoc/pandadoc_client'
import { esignService } from '#modules/documents/services/esign_service'

export default class PandadocWebhooksController {
  async handle({ request, response }: HttpContext) {
    const secret = env.get('PANDADOC_WEBHOOKS_SECRET')
    if (!secret) {
      return response.serviceUnavailable({ error: 'PandaDoc webhooks are not configured' })
    }

    const authorization = request.header('authorization')
    if (!pandadocClient.verifyWebhookAuthorization(authorization)) {
      return response.unauthorized({ error: 'Invalid PandaDoc webhook authorization' })
    }

    const body = request.body() as {
      event?: string
      data?: { id?: string; status?: string }
    }

    // PandaDoc may wrap events in an array
    const events = Array.isArray(body) ? body : [body]
    const results = []
    for (const event of events) {
      results.push(await esignService.handleWebhook(event))
    }

    return response.ok({ results })
  }
}
