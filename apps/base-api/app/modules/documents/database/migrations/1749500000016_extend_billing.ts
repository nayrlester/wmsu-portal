import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('plans', (table) => {
      table.string('paymongo_plan_id_monthly', 255).nullable()
      table.string('paymongo_plan_id_annual', 255).nullable()
      table.integer('sort_order').notNullable().defaultTo(0)
    })

    this.schema.alterTable('subscriptions', (table) => {
      table.string('billing_provider', 30).nullable()
      table.uuid('coupon_id').nullable().references('id').inTable('coupons').onDelete('SET NULL')
      table.uuid('pending_plan_id').nullable().references('id').inTable('plans').onDelete('SET NULL')
      table.string('pending_billing_cycle', 20).nullable()
    })

    this.schema.alterTable('invoices', (table) => {
      table.string('provider', 30).nullable()
      table.string('provider_invoice_id', 255).nullable()
      table.uuid('coupon_id').nullable().references('id').inTable('coupons').onDelete('SET NULL')
      table.unique(['provider', 'provider_invoice_id'])
    })

    this.schema.createTable('billing_customers', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('provider', 30).notNullable()
      table.string('provider_customer_id', 255).notNullable()
      table.string('billing_email', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'provider'])
      table.unique(['provider', 'provider_customer_id'])
    })

    this.schema.createTable('billing_webhook_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('provider', 30).notNullable()
      table.string('event_id', 255).notNullable()
      table.string('event_type', 120).notNullable()
      table.jsonb('payload').nullable()
      table.timestamp('processed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['provider', 'event_id'])
    })

    this.schema.createTable('usage_records', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('metric', 50).notNullable()
      table.decimal('quantity', 16, 4).notNullable()
      table.timestamp('period_start', { useTz: true }).notNullable()
      table.timestamp('period_end', { useTz: true }).notNullable()
      table.jsonb('metadata').nullable()
      table.timestamp('recorded_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id', 'metric', 'period_start'])
    })
  }

  async down() {
    this.schema.dropTable('usage_records')
    this.schema.dropTable('billing_webhook_events')
    this.schema.dropTable('billing_customers')

    this.schema.alterTable('invoices', (table) => {
      table.dropUnique(['provider', 'provider_invoice_id'])
      table.dropColumn('coupon_id')
      table.dropColumn('provider_invoice_id')
      table.dropColumn('provider')
    })

    this.schema.alterTable('subscriptions', (table) => {
      table.dropColumn('pending_billing_cycle')
      table.dropColumn('pending_plan_id')
      table.dropColumn('coupon_id')
      table.dropColumn('billing_provider')
    })

    this.schema.alterTable('plans', (table) => {
      table.dropColumn('sort_order')
      table.dropColumn('paymongo_plan_id_annual')
      table.dropColumn('paymongo_plan_id_monthly')
    })
  }
}
