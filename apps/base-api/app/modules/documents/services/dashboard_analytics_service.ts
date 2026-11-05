import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import DocumentView from '#modules/documents/models/document_view'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentFileRepository } from '#infrastructure/repositories/document_file_repository'
import { cacheService } from '#infrastructure/cache/redis_cache_service'
import env from '#start/env'

const DASHBOARD_CACHE_TTL = () => env.get('CACHE_TTL_DASHBOARD_SECONDS') ?? 60

export interface DashboardUserAccess {
  totalUsers: number
  activeUsers7d: number
  activeUsers30d: number
  lastAccessedAt: string | null
  uniqueViewers7d: number
  totalViews7d: number
}

export class DashboardAnalyticsService {
  async getFilesTrend(days = 30) {
    const tenantId = tenantContext.requireTenantId()
    const boundedDays = Math.min(Math.max(days, 1), 90)
    const cacheKey = `cache:dashboard:files-trend:${tenantId}:${boundedDays}`

    return cacheService.remember(cacheKey, DASHBOARD_CACHE_TTL(), () =>
      documentFileRepository.countCreatedByDay(boundedDays)
    )
  }

  async getUserAccess(): Promise<DashboardUserAccess> {
    const tenantId = tenantContext.requireTenantId()
    const cacheKey = `cache:dashboard:user-access:${tenantId}`

    return cacheService.remember(cacheKey, DASHBOARD_CACHE_TTL(), async () => {
      const baseQuery = User.query()
        .where('tenant_id', tenantId)
        .where('status', 'active')
        .whereNull('deleted_at')

      const totalRow = await baseQuery.clone().count('* as total')
      const totalUsers = Number(totalRow[0]?.$extras.total ?? 0)

      const now = DateTime.now()
      const since7d = now.minus({ days: 7 }).toSQL()!
      const since30d = now.minus({ days: 30 }).toSQL()!

      const active7Row = await baseQuery
        .clone()
        .whereNotNull('last_login_at')
        .where('last_login_at', '>=', since7d)
        .count('* as total')
      const active30Row = await baseQuery
        .clone()
        .whereNotNull('last_login_at')
        .where('last_login_at', '>=', since30d)
        .count('* as total')

      const lastLoginRow = await baseQuery.clone().max('last_login_at as last_login_at')
      const lastAccessedAt = lastLoginRow[0]?.$extras.last_login_at
        ? DateTime.fromSQL(String(lastLoginRow[0].$extras.last_login_at)).toISO()
        : null

      const viewersRow = await DocumentView.query()
        .where('tenant_id', tenantId)
        .where('viewed_at', '>=', since7d)
        .countDistinct('user_id as total')
      const viewsRow = await DocumentView.query()
        .where('tenant_id', tenantId)
        .where('viewed_at', '>=', since7d)
        .count('* as total')

      return {
        totalUsers,
        activeUsers7d: Number(active7Row[0]?.$extras.total ?? 0),
        activeUsers30d: Number(active30Row[0]?.$extras.total ?? 0),
        lastAccessedAt,
        uniqueViewers7d: Number(viewersRow[0]?.$extras.total ?? 0),
        totalViews7d: Number(viewsRow[0]?.$extras.total ?? 0),
      }
    })
  }

  async invalidateCache(tenantId: string) {
    await cacheService.forget(`cache:dashboard:user-access:${tenantId}`)
    await Promise.all(
      [7, 14, 30, 90].map((days) => cacheService.forget(`cache:dashboard:files-trend:${tenantId}:${days}`))
    )
  }
}

export const dashboardAnalyticsService = new DashboardAnalyticsService()
