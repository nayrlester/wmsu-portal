import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('tenants', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name', 255).notNullable()
      table.string('slug', 100).notNullable().unique()
      table.string('status', 30).notNullable().defaultTo('active')
      table.string('plan_tier', 50).nullable()
      table.timestamp('trial_ends_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.index(['slug'])
      table.index(['status'])
    })

    this.schema.createTable('tenant_domains', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('domain', 255).notNullable().unique()
      table.boolean('is_primary').notNullable().defaultTo(false)
      table.boolean('is_verified').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
    })

    this.schema.createTable('tenant_branding', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').unique()
      table.string('logo_url', 500).nullable()
      table.string('favicon_url', 500).nullable()
      table.string('primary_color', 20).nullable()
      table.string('secondary_color', 20).nullable()
      table.string('login_background_url', 500).nullable()
      table.jsonb('custom_css').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.schema.createTable('tenant_settings', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').unique()
      table.string('timezone', 50).notNullable().defaultTo('Asia/Manila')
      table.string('locale', 10).notNullable().defaultTo('en')
      table.string('date_format', 30).notNullable().defaultTo('YYYY-MM-DD')
      table.string('tracking_prefix', 20).notNullable().defaultTo('DTS')
      table.jsonb('notification_preferences').nullable()
      table.jsonb('feature_flags').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable('tenant_settings')
    this.schema.dropTable('tenant_branding')
    this.schema.dropTable('tenant_domains')
    this.schema.dropTable('tenants')
  }
}
