import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/inventory/helpers/db_schema'

export class DashboardService {
  async getSummary(orgId: string) {
    const [items, assets, warehouses, lowStock, nearExpiry, categories, stockValue] =
      await Promise.all([
        this.countItems(orgId),
        this.assetSummary(orgId),
        this.countWarehouses(orgId),
        this.lowStockItems(orgId),
        this.nearExpiryItems(orgId),
        this.categorySummary(orgId),
        this.stockValue(orgId),
      ])

    return { items, assets, warehouses, lowStock, nearExpiry, categories, stockValue }
  }

  private async stockValue(orgId: string) {
    const result = await db.rawQuery(
      `SELECT COALESCE(SUM(sb.quantity * COALESCE(sb.avg_unit_cost, 0)), 0) AS total
       FROM ${t('stock_balances')} sb
       INNER JOIN ${t('items')} i ON i.id = sb.item_id
       WHERE i.organization_id = ?
         AND i.deleted_at IS NULL`,
      [orgId]
    )
    const row = result.rows?.[0] ?? result[0]
    return Number(row?.total ?? 0)
  }

  private async countItems(orgId: string) {
    const [{ count }] = await db
      .from(t('items'))
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .count('* as count')
    return Number(count)
  }

  private async assetSummary(orgId: string) {
    const rows = await db
      .from(t('assets'))
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .select('status')
      .count('* as count')
      .groupBy('status')

    const result: Record<string, number> = { total: 0 }
    for (const row of rows) {
      result[row.status] = Number(row.count)
      result.total += Number(row.count)
    }
    return result
  }

  private async countWarehouses(orgId: string) {
    const [{ count }] = await db
      .from(t('warehouses'))
      .where('organization_id', orgId)
      .count('* as count')
    return Number(count)
  }

  private async lowStockItems(orgId: string, limit = 10) {
    return db
      .from(t('stock_balances as sb'))
      .join(t('items as i'), 'i.id', 'sb.item_id')
      .where('i.organization_id', orgId)
      .whereNull('i.deleted_at')
      .whereRaw('sb.quantity <= i.min_stock')
      .select('i.id', 'i.name', 'i.sku', 'i.min_stock', 'sb.quantity', 'sb.warehouse_id')
      .orderByRaw('sb.quantity - i.min_stock ASC')
      .limit(limit)
  }

  private async nearExpiryItems(orgId: string, limit = 10) {
    return db
      .from(t('stock_balances as sb'))
      .join(t('items as i'), 'i.id', 'sb.item_id')
      .where('i.organization_id', orgId)
      .whereNull('i.deleted_at')
      .whereNotNull('sb.expires_at')
      .whereRaw(`sb.expires_at <= CURRENT_DATE + INTERVAL '30 days'`)
      .where('sb.quantity', '>', 0)
      .select('i.id', 'i.name', 'i.sku', 'sb.quantity', 'sb.expires_at', 'sb.warehouse_id')
      .orderBy('sb.expires_at', 'asc')
      .limit(limit)
  }

  private async categorySummary(orgId: string) {
    return db
      .from(t('item_categories as c'))
      .where('c.organization_id', orgId)
      .leftJoin(t('items as i'), (j) => {
        j.on('i.category_id', 'c.id').andOnNull('i.deleted_at')
      })
      .select('c.id', 'c.name', 'c.code')
      .count('i.id as item_count')
      .groupBy('c.id', 'c.name', 'c.code')
      .orderBy('c.name')
  }
}

export const dashboardService = new DashboardService()
