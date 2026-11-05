import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { seedUimsDemoData } from '#modules/enrollment/domain/seed_demo_data'

export default class UimsSeedDemo extends BaseCommand {
  static commandName = 'uims:seed-demo'
  static description =
    'Idempotent demo seed: RBAC roles/permissions, catalog, stock, assets for UNI (or --org)'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Organization code (default UNI or PLATFORM_DEFAULT_ORG_CODE)' })
  declare org: string | undefined

  async run() {
    const orgCode =
      this.org?.trim() || env.get('PLATFORM_DEFAULT_ORG_CODE') || 'UNI'

    this.logger.info(`Seeding UIMS demo data for org code "${orgCode}"…`)
    const result = await seedUimsDemoData(orgCode)

    this.logger.success(
      `Org ${result.orgCode} (${result.orgId}): roles=${result.roles.join(',')}; categories=${result.categories}; items=${result.items}; assets=${result.assets}; warehouses=${result.warehouses}; stockSeeded=${result.stockSeeded}`
    )
    this.logger.info(`Local demo users: ${result.users.join(', ')} (password from DEMO_SEED_PASSWORD)`)
  }
}
