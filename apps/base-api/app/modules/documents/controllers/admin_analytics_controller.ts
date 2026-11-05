import type { HttpContext } from '@adonisjs/core/http'
import { platformAnalyticsService } from '#modules/documents/services/platform_analytics_service'

export default class AdminAnalyticsController {
  async overview({ response }: HttpContext) {
    const overview = await platformAnalyticsService.getOverview()
    return response.ok({ overview })
  }

  async revenue({ request, response }: HttpContext) {
    const months = Number(request.input('months', 6))
    const [monthly, byPlan] = await Promise.all([
      platformAnalyticsService.getMonthlyRevenue(months),
      platformAnalyticsService.getRevenueByPlan(),
    ])

    return response.ok({ monthly, byPlan })
  }

  async tenantUsage({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 20))
    const result = await platformAnalyticsService.getTenantUsage(page, limit)
    return response.ok(result)
  }
}
