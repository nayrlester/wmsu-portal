import { BaseSchema } from '@adonisjs/lucid/schema'

function financeTable(table: string) {
  return `finance.${table}`
}

export default class extends BaseSchema {
  protected schemaName = 'finance'

  async up() {
    const s = this.schema.withSchema(this.schemaName)

    s.createTable('student_ar_open_items', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.string('student_number', 64).notNullable()
      t.uuid('assessment_id').nullable().references('id').inTable(financeTable('student_assessments')).onDelete('SET NULL')
      t.string('assessment_number', 64).nullable()
      t.string('source_type', 32).notNullable().defaultTo('assessment')
      t.string('reference', 128).nullable()
      t.decimal('original_amount', 15, 2).notNullable()
      t.decimal('open_amount', 15, 2).notNullable()
      t.string('status', 32).notNullable().defaultTo('open')
      t.timestamp('opened_at', { useTz: true }).notNullable()
      t.timestamp('closed_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'student_number'])
      t.index(['organization_id', 'status'])
    })

    s.createTable('ufms_system_settings', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.boolean('hard_budget_stop').notNullable().defaultTo(false)
      t.uuid('tuition_or_series_id').nullable().references('id').inTable(financeTable('or_series')).onDelete('SET NULL')
      t.uuid('ar_receivable_account_id').nullable().references('id').inTable(financeTable('chart_of_accounts')).onDelete('SET NULL')
      t.uuid('ar_cash_account_id').nullable().references('id').inTable(financeTable('chart_of_accounts')).onDelete('SET NULL')
      t.uuid('ar_revenue_account_id').nullable().references('id').inTable(financeTable('chart_of_accounts')).onDelete('SET NULL')
      t.uuid('default_fund_id').nullable().references('id').inTable(financeTable('funds')).onDelete('SET NULL')
      t.string('uims_api_url', 512).nullable()
      t.string('uims_service_api_key', 255).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id'])
    })

    s.createTable('deposit_slips', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.string('slip_number', 64).notNullable()
      t.uuid('bank_account_id').nullable().references('id').inTable(financeTable('bank_accounts')).onDelete('SET NULL')
      t.date('deposit_date').notNullable()
      t.decimal('total_amount', 15, 2).notNullable()
      t.string('status', 32).notNullable().defaultTo('draft')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'slip_number'])
    })

    s.createTable('deposit_slip_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('deposit_slip_id').notNullable().references('id').inTable(financeTable('deposit_slips')).onDelete('CASCADE')
      t.uuid('payment_id').nullable().references('id').inTable(financeTable('student_payments')).onDelete('SET NULL')
      t.string('or_number', 64).nullable()
      t.decimal('amount', 15, 2).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
    })

    s.createTable('vendor_invoices', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.uuid('supplier_id').nullable().references('id').inTable(financeTable('suppliers')).onDelete('SET NULL')
      t.uuid('purchase_order_id').nullable().references('id').inTable(financeTable('purchase_orders')).onDelete('SET NULL')
      t.uuid('iar_id').nullable().references('id').inTable(financeTable('inspection_acceptance_reports')).onDelete('SET NULL')
      t.string('invoice_number', 128).notNullable()
      t.decimal('amount', 15, 2).notNullable()
      t.decimal('withholding_amount', 15, 2).notNullable().defaultTo(0)
      t.string('status', 32).notNullable().defaultTo('draft')
      t.string('match_status', 32).notNullable().defaultTo('pending')
      t.timestamp('invoice_date', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'invoice_number'])
    })

    s.createTable('disbursement_vouchers', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.string('dv_number', 64).notNullable()
      t.uuid('vendor_invoice_id').nullable().references('id').inTable(financeTable('vendor_invoices')).onDelete('SET NULL')
      t.uuid('obligation_id').nullable().references('id').inTable(financeTable('budget_obligations')).onDelete('SET NULL')
      t.string('payee_name', 255).notNullable()
      t.decimal('gross_amount', 15, 2).notNullable()
      t.decimal('withholding_amount', 15, 2).notNullable().defaultTo(0)
      t.decimal('net_amount', 15, 2).notNullable()
      t.string('payment_mode', 32).notNullable().defaultTo('cheque')
      t.string('status', 32).notNullable().defaultTo('draft')
      t.string('udms_document_ref', 255).nullable()
      t.timestamp('approved_at', { useTz: true }).nullable()
      t.timestamp('paid_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'dv_number'])
    })

    s.createTable('cheque_register', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.uuid('disbursement_voucher_id').nullable().references('id').inTable(financeTable('disbursement_vouchers')).onDelete('SET NULL')
      t.uuid('bank_account_id').nullable().references('id').inTable(financeTable('bank_accounts')).onDelete('SET NULL')
      t.uuid('fund_id').nullable().references('id').inTable(financeTable('funds')).onDelete('SET NULL')
      t.string('cheque_number', 64).notNullable()
      t.string('payee_name', 255).notNullable()
      t.decimal('amount', 15, 2).notNullable()
      t.string('amount_words', 512).notNullable()
      t.date('cheque_date').notNullable()
      t.string('status', 32).notNullable().defaultTo('issued')
      t.timestamp('voided_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'bank_account_id', 'cheque_number'])
    })

    s.createTable('agency_export_jobs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.string('agency_code', 32).notNullable()
      t.string('export_format', 32).notNullable()
      t.string('status', 32).notNullable().defaultTo('completed')
      t.jsonb('payload').nullable()
      t.timestamp('exported_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
    })

    s.createTable('approval_instances', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(financeTable('organizations')).onDelete('CASCADE')
      t.uuid('workflow_id').nullable().references('id').inTable(financeTable('approval_workflow_definitions')).onDelete('SET NULL')
      t.string('entity_type', 64).notNullable()
      t.uuid('entity_id').notNullable()
      t.string('status', 32).notNullable().defaultTo('pending')
      t.integer('current_step_order').notNullable().defaultTo(1)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    s.createTable('approval_instance_steps', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('instance_id').notNullable().references('id').inTable(financeTable('approval_instances')).onDelete('CASCADE')
      t.integer('step_order').notNullable()
      t.string('name', 128).notNullable()
      t.string('decision', 32).nullable()
      t.uuid('decided_by').nullable().references('id').inTable(financeTable('users')).onDelete('SET NULL')
      t.timestamp('decided_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    const s = this.schema.withSchema(this.schemaName)
    s.dropTableIfExists('approval_instance_steps')
    s.dropTableIfExists('approval_instances')
    s.dropTableIfExists('agency_export_jobs')
    s.dropTableIfExists('cheque_register')
    s.dropTableIfExists('disbursement_vouchers')
    s.dropTableIfExists('vendor_invoices')
    s.dropTableIfExists('deposit_slip_lines')
    s.dropTableIfExists('deposit_slips')
    s.dropTableIfExists('ufms_system_settings')
    s.dropTableIfExists('student_ar_open_items')
  }
}
