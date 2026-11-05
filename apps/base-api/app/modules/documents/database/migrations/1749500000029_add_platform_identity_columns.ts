import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Platform Identity SSO: link local users/tenants to enterprise Identity subjects.
 */
export default class extends BaseSchema {
  async up() {
    const hasPlatformUserId = await this.schema.hasColumn('users', 'platform_user_id')
    if (!hasPlatformUserId) {
      this.schema.alterTable('users', (table) => {
        table.string('platform_user_id', 255).nullable()
        table.unique(['platform_user_id'])
        table.index(['platform_user_id'])
      })
    }

    const hasPlatformOrgId = await this.schema.hasColumn('tenants', 'platform_organization_id')
    if (!hasPlatformOrgId) {
      this.schema.alterTable('tenants', (table) => {
        table.string('platform_organization_id', 255).nullable()
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
