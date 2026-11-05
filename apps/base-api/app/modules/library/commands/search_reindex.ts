import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SearchIndexerService from '#modules/library/services/search/search_indexer_service'
import Tenant from '#modules/library/models/tenant'

export default class SearchReindex extends BaseCommand {
  static commandName = 'search:reindex'
  static description = 'Rebuild search index for one or all tenants'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Tenant slug (optional)', required: false })
  declare tenant?: string

  async run() {
    const indexer = new SearchIndexerService()

    if (this.tenant) {
      const tenantRecord = await Tenant.findByOrFail('slug', this.tenant)
      const stats = await indexer.reindexTenant(tenantRecord.id)
      this.logger.success(
        `Reindexed ${this.tenant}: ${stats.books} books, ${stats.members} members, ${stats.transactions} transactions`
      )
      return
    }

    const tenants = await Tenant.query().where('status', 'active')
    for (const tenantRecord of tenants) {
      const stats = await indexer.reindexTenant(tenantRecord.id)
      this.logger.info(
        `${tenantRecord.slug}: ${stats.books} books, ${stats.members} members, ${stats.transactions} transactions`
      )
    }

    this.logger.success(`Reindexed ${tenants.length} tenant(s)`)
  }
}
