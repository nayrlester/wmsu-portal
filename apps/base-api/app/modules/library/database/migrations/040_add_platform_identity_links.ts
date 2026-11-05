import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Platform Identity SSO links.
 * Idempotent: production DBs may already have these columns from a partial run.
 */
export default class extends BaseSchema {
  async up() {
    const hasPlatformUserId = await this.schema.hasColumn('users', 'platform_user_id')
    if (!hasPlatformUserId) {
      this.schema.alterTable('users', (table) => {
        table.uuid('platform_user_id').nullable()
        table.unique(['platform_user_id'])
        table.index(['platform_user_id'])
      })
    }

    const hasPlatformOrgId = await this.schema.hasColumn('tenants', 'platform_organization_id')
    if (!hasPlatformOrgId) {
      this.schema.alterTable('tenants', (table) => {
        table.uuid('platform_organization_id').nullable()
        table.index(['platform_organization_id'])
      })
    }
  }

  async down() {
    if (await this.schema.hasColumn('users', 'platform_user_id')) {
      this.schema.alterTable('users', (table) => {
        table.dropColumn('platform_user_id')
      })
    }

    if (await this.schema.hasColumn('tenants', 'platform_organization_id')) {
      this.schema.alterTable('tenants', (table) => {
        table.dropColumn('platform_organization_id')
      })
    }
  }
}
