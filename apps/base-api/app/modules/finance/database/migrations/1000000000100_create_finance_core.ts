import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('chart_of_accounts', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('account_code', 64).notNullable()
      t.string('account_title', 255).notNullable()
      t.string('account_type', 32).notNullable()
      t.uuid('parent_id').nullable().references('id').inTable(uimsTable('chart_of_accounts')).onDelete('SET NULL')
      t.boolean('is_active').defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'account_code'])
    })

    this.s.createTable('funds', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('fund_code', 64).notNullable()
      t.string('fund_name', 255).notNullable()
      t.string('fund_type', 32).nullable()
      t.decimal('opening_balance', 15, 2).defaultTo(0)
      t.boolean('is_active').defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'fund_code'])
    })

    this.s.createTable('budget_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('fund_id').notNullable().references('id').inTable(uimsTable('funds')).onDelete('CASCADE')
      t.uuid('account_id').notNullable().references('id').inTable(uimsTable('chart_of_accounts')).onDelete('CASCADE')
      t.string('fiscal_year', 4).notNullable()
      t.decimal('allocated_amount', 15, 2).notNullable()
      t.decimal('utilized_amount', 15, 2).defaultTo(0)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('official_receipts', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('or_number', 64).notNullable().unique()
      t.string('payer_name', 255).notNullable()
      t.string('payer_type', 32).defaultTo('student')
      t.string('payer_reference', 64).nullable()
      t.decimal('amount', 15, 2).notNullable()
      t.text('particulars').nullable()
      t.timestamp('issued_at', { useTz: true }).notNullable()
      t.uuid('issued_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('student_payments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('student_number', 64).notNullable()
      t.uuid('or_id').nullable().references('id').inTable(uimsTable('official_receipts')).onDelete('SET NULL')
      t.decimal('amount', 15, 2).notNullable()
      t.string('payment_type', 32).defaultTo('tuition')
      t.string('reference', 128).nullable()
      t.timestamp('paid_at', { useTz: true }).notNullable()
      t.uuid('received_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('purchase_requisitions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('pr_number', 64).notNullable().unique()
      t.uuid('requesting_office_id').nullable().references('id').inTable(uimsTable('offices')).onDelete('SET NULL')
      t.text('purpose').nullable()
      t.decimal('estimated_amount', 15, 2).nullable()
      t.string('status', 32).defaultTo('draft')
      t.timestamp('submitted_at', { useTz: true }).nullable()
      t.timestamp('approved_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('purchase_orders', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('po_number', 64).notNullable().unique()
      t.uuid('pr_id').nullable().references('id').inTable(uimsTable('purchase_requisitions')).onDelete('SET NULL')
      t.string('supplier_name', 255).nullable()
      t.decimal('total_amount', 15, 2).notNullable()
      t.text('terms').nullable()
      t.string('status', 32).defaultTo('draft')
      t.timestamp('issued_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.s.dropTableIfExists('purchase_orders')
    this.s.dropTableIfExists('purchase_requisitions')
    this.s.dropTableIfExists('student_payments')
    this.s.dropTableIfExists('official_receipts')
    this.s.dropTableIfExists('budget_lines')
    this.s.dropTableIfExists('funds')
    this.s.dropTableIfExists('chart_of_accounts')
  }
}
