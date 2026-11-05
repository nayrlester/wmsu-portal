import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class RefreshDashboardStats extends BaseCommand {
  static commandName = 'dashboard:refresh-stats'
  static description = 'Refresh materialized view for tenant document status aggregates'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    await db.rawQuery(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_document_stats AS
      SELECT
        tenant_id,
        status,
        count(*)::bigint AS doc_count,
        max(updated_at) AS last_updated
      FROM documents
      WHERE deleted_at IS NULL
      GROUP BY tenant_id, status
    `)
    await db.rawQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tenant_document_stats
      ON mv_tenant_document_stats (tenant_id, status)
    `)
    await db.rawQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_document_stats')
    this.logger.success('Refreshed mv_tenant_document_stats')
  }
}
