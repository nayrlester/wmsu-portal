import type { HttpContext } from '@adonisjs/core/http'
import { dashboardService } from '#modules/enrollment/services/dashboard_service'

export default class DashboardController {
  async summary({ auth, response }: HttpContext) {
    const data = await dashboardService.getSummary(auth.user!.organizationId)
    return response.ok({ data })
  }
}
