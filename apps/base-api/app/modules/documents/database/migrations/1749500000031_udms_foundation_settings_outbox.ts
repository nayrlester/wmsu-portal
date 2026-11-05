import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('udms_system_settings', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('setting_key', 128).notNullable()
      table.jsonb('setting_value').notNullable().defaultTo('{}')
      table.string('description', 500).nullable()
      table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['tenant_id', 'setting_key'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('udms_integration_outbox', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('contract_code', 64).notNullable()
      table.string('target_system', 32).notNullable()
      table.string('event_type', 128).notNullable()
      table.string('idempotency_key', 191).notNullable()
      table.jsonb('payload').notNullable().defaultTo('{}')
      table.string('status', 32).notNullable().defaultTo('pending')
      table.text('last_error').nullable()
      table.integer('attempt_count').notNullable().defaultTo(0)
      table.timestamp('processed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['tenant_id', 'idempotency_key'])
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'contract_code'])
      table.index(['tenant_id', 'target_system'])
    })
  }

  async down() {
    this.schema.dropTable('udms_integration_outbox')
    this.schema.dropTable('udms_system_settings')
  }
}
