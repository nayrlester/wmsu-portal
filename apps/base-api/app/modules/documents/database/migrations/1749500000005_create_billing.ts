import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('plans', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name', 100).notNullable()
      table.string('slug', 50).notNullable().unique()
      table.text('description').nullable()
      table.decimal('monthly_price', 12, 2).notNullable()
      table.decimal('annual_price', 12, 2).notNullable()
      table.string('currency', 3).notNullable().defaultTo('USD')
      table.integer('max_users').nullable()
      table.integer('max_documents').nullable()
      table.bigInteger('max_storage_bytes').nullable()
      table.jsonb('features').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.string('stripe_price_id_monthly', 255).nullable()
      table.string('stripe_price_id_annual', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.schema.createTable('subscriptions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('plan_id').notNullable().references('id').inTable('plans').onDelete('RESTRICT')
      table.string('status', 30).notNullable().defaultTo('trialing')
      table.string('billing_cycle', 20).notNullable().defaultTo('monthly')
      table.string('stripe_subscription_id', 255).nullable()
      table.string('paymongo_subscription_id', 255).nullable()
      table.timestamp('trial_ends_at', { useTz: true }).nullable()
      table.timestamp('current_period_start', { useTz: true }).nullable()
      table.timestamp('current_period_end', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
      table.index(['status'])
    })

    this.schema.createTable('payments', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('subscription_id').nullable().references('id').inTable('subscriptions').onDelete('SET NULL')
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).notNullable().defaultTo('USD')
      table.string('status', 30).notNullable()
      table.string('provider', 30).notNullable()
      table.string('provider_payment_id', 255).nullable()
      table.jsonb('metadata').nullable()
      table.timestamp('paid_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id'])
    })

    this.schema.createTable('invoices', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('subscription_id').nullable().references('id').inTable('subscriptions').onDelete('SET NULL')
      table.string('invoice_number', 50).notNullable().unique()
      table.decimal('amount', 12, 2).notNullable()
      table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0)
      table.string('currency', 3).notNullable().defaultTo('USD')
      table.string('status', 30).notNullable().defaultTo('draft')
      table.timestamp('due_date', { useTz: true }).nullable()
      table.timestamp('paid_at', { useTz: true }).nullable()
      table.string('pdf_url', 500).nullable()
      table.jsonb('line_items').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
    })

    this.schema.createTable('coupons', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('code', 50).notNullable().unique()
      table.string('discount_type', 20).notNullable()
      table.decimal('discount_value', 12, 2).notNullable()
      table.integer('max_uses').nullable()
      table.integer('used_count').notNullable().defaultTo(0)
      table.timestamp('expires_at', { useTz: true }).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable('coupons')
    this.schema.dropTable('invoices')
    this.schema.dropTable('payments')
    this.schema.dropTable('subscriptions')
    this.schema.dropTable('plans')
  }
}
