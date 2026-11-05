import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

async function countWhere(table: string, orgId: string, extra = '') {
  const result = await db.rawQuery(
    `SELECT COUNT(*)::int AS total FROM ${t(table)} WHERE organization_id = ? ${extra}`,
    [orgId]
  )
  const row = result.rows?.[0] ?? result[0]
  return Number(row?.total ?? 0)
}

export class DashboardService {
  async getSummary(orgId: string) {
    const [
      budgetPlans,
      journalEntries,
      openPurchaseOrders,
      posSalesToday,
      pendingRequisitions,
    ] = await Promise.all([
      countWhere('financial_plans', orgId),
      countWhere('journal_entries', orgId),
      countWhere('purchase_orders', orgId, "AND status NOT IN ('closed', 'cancelled')"),
      this.posSalesToday(orgId),
      countWhere('purchase_requisitions', orgId, "AND status IN ('draft', 'submitted', 'approved')"),
    ])

    return {
      budgetPlans,
      journalEntries,
      openPurchaseOrders,
      posSalesToday,
      pendingRequisitions,
    }
  }

  private async posSalesToday(orgId: string) {
    const result = await db.rawQuery(
      `SELECT COUNT(*)::int AS total FROM ${t('pos_sales')}
       WHERE organization_id = ?
         AND completed_at >= CURRENT_DATE
         AND status = 'completed'`,
      [orgId]
    )
    const row = result.rows?.[0] ?? result[0]
    return Number(row?.total ?? 0)
  }
}

export const dashboardService = new DashboardService()
