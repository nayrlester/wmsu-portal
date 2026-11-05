import type { HttpContext } from '@adonisjs/core/http'
import { platformAnalyticsService } from '#modules/documents/services/platform_analytics_service'

export default class AdminBillingController {
  async overview({ response }: HttpContext) {
    const billing = await platformAnalyticsService.getBillingOverview()
    return response.ok({ billing })
  }
}
