import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('members', (table) => {
      table.timestamp('membership_expires_at', { useTz: true }).nullable()
      table.index(['tenant_id', 'membership_expires_at'])
    })

    this.schema.alterTable('notification_logs', (table) => {
      table.text('failed_reason').nullable()
    })
  }

  async down() {
    this.schema.alterTable('members', (table) => {
      table.dropIndex(['tenant_id', 'membership_expires_at'])
      table.dropColumn('membership_expires_at')
    })

    this.schema.alterTable('notification_logs', (table) => {
      table.dropColumn('failed_reason')
    })
  }
}
