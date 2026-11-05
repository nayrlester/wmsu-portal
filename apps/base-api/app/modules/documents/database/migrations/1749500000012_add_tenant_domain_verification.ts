import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tenant_domains', (table) => {
      table.string('verification_token_hash', 128).nullable()
      table.timestamp('verification_expires_at', { useTz: true }).nullable()
      table.timestamp('verified_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable('tenant_domains', (table) => {
      table.dropColumn('verification_token_hash')
      table.dropColumn('verification_expires_at')
      table.dropColumn('verified_at')
    })
  }
}
