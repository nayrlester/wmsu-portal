import type { HttpContext } from '@adonisjs/core/http'
import AnalyticsService from '#modules/library/services/analytics/analytics_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { analyticsDashboardValidator } from '#modules/library/validators/analytics'

export default class AnalyticsController {
  private analyticsService = new AnalyticsService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'analytics:read')) {
      throw new ForbiddenException('Missing permission: analytics:read')
    }
  }

  async dashboard(ctx: HttpContext) {
    this.ensure(ctx)
    const filters = await ctx.request.validateUsing(analyticsDashboardValidator)
    const data = await this.analyticsService.getDashboard(filters)

    return ctx.response.ok({ success: true, data })
  }
}
