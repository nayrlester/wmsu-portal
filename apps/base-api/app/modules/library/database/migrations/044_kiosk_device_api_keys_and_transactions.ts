import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('kiosk_devices', (table) => {
      table.string('api_key_hash', 255).nullable()
      table.string('api_key_prefix', 16).nullable()
    })

    this.schema.createTable('kiosk_transactions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table
        .uuid('kiosk_device_id')
        .notNullable()
        .references('id')
        .inTable('kiosk_devices')
        .onDelete('CASCADE')
      table.uuid('member_id').nullable().references('id').inTable('members').onDelete('SET NULL')
      table.string('action', 50).notNullable()
      table.jsonb('payload').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['tenant_id', 'kiosk_device_id', 'created_at'])
      table.index(['tenant_id', 'action'])
    })
  }

  async down() {
    this.schema.dropTable('kiosk_transactions')
    this.schema.alterTable('kiosk_devices', (table) => {
      table.dropColumn('api_key_hash')
      table.dropColumn('api_key_prefix')
    })
  }
}
