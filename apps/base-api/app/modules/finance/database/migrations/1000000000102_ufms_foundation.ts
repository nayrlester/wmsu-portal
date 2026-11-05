import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.alterTable('chart_of_accounts', (t) => {
      t.string('uacs_code', 64).nullable()
      t.text('description').nullable()
      t.uuid('contra_account_id').nullable().references('id').inTable(uimsTable('chart_of_accounts')).onDelete('SET NULL')
      t.string('subsidiary_tag', 64).nullable()
      t.integer('sort_order').notNullable().defaultTo(0)
      t.boolean('is_postable').notNullable().defaultTo(true)
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.index(['organization_id', 'uacs_code'])
      t.index(['organization_id', 'sort_order'])
    })

    this.s.alterTable('funds', (t) => {
      t.text('description').nullable()
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.index(['organization_id', 'fund_type'])
    })

    this.s.alterTable('budget_lines', (t) => {
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.index(['organization_id', 'fiscal_year', 'fund_id'])
      t.unique(['organization_id', 'fund_id', 'account_id', 'fiscal_year'])
    })

    this.s.createTable('banks', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t.string('bank_code', 64).notNullable()
      t.string('bank_name', 255).notNullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'bank_code'])
    })

    this.s.createTable('bank_accounts', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t.uuid('bank_id').notNullable().references('id').inTable(uimsTable('banks')).onDelete('RESTRICT')
      t.uuid('fund_id').nullable().references('id').inTable(uimsTable('funds')).onDelete('SET NULL')
      t.string('account_number', 64).notNullable()
      t.string('account_name', 255).notNullable()
      t.string('currency_code', 8).notNullable().defaultTo('PHP')
      t.boolean('is_active').notNullable().defaultTo(true)
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'bank_id', 'account_number'])
      t.index(['organization_id', 'fund_id'])
    })

    this.s.createTable('fiscal_periods', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t.string('code', 32).notNullable()
      t.string('name', 128).notNullable()
      t.date('starts_on').notNullable()
      t.date('ends_on').notNullable()
      t.string('status', 32).notNullable().defaultTo('open')
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
      t.index(['organization_id', 'status'])
    })

    this.s.createTable('or_series', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t.string('series_code', 32).notNullable()
      t.string('prefix', 32).notNullable()
      t.bigInteger('next_number').notNullable().defaultTo(1)
      t.integer('padding').notNullable().defaultTo(6)
      t.boolean('is_active').notNullable().defaultTo(true)
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'series_code'])
    })

    this.s.alterTable('official_receipts', (t) => {
      t.uuid('or_series_id').nullable().references('id').inTable(uimsTable('or_series')).onDelete('SET NULL')
      t.index(['organization_id', 'issued_at'])
    })

    this.s.alterTable('student_payments', (t) => {
      t.index(['organization_id', 'student_number'])
      t.index(['organization_id', 'assessment_number'])
    })

    this.s.createTable('approval_workflow_definitions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t.string('code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.string('entity_type', 64).notNullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('approval_workflow_steps', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('workflow_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('approval_workflow_definitions'))
        .onDelete('RESTRICT')
      t.integer('step_order').notNullable()
      t.string('name', 128).notNullable()
      t.string('required_permission', 128).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['workflow_id', 'step_order'])
    })
  }

  async down() {
    this.s.dropTableIfExists('approval_workflow_steps')
    this.s.dropTableIfExists('approval_workflow_definitions')

    this.s.alterTable('student_payments', (t) => {
      t.dropIndex(['organization_id', 'student_number'])
      t.dropIndex(['organization_id', 'assessment_number'])
    })

    this.s.alterTable('official_receipts', (t) => {
      t.dropIndex(['organization_id', 'issued_at'])
      t.dropColumn('or_series_id')
    })

    this.s.dropTableIfExists('or_series')
    this.s.dropTableIfExists('fiscal_periods')
    this.s.dropTableIfExists('bank_accounts')
    this.s.dropTableIfExists('banks')

    this.s.alterTable('budget_lines', (t) => {
      t.dropUnique(['organization_id', 'fund_id', 'account_id', 'fiscal_year'])
      t.dropIndex(['organization_id', 'fiscal_year', 'fund_id'])
      t.dropColumn('created_by')
      t.dropColumn('updated_by')
    })

    this.s.alterTable('funds', (t) => {
      t.dropIndex(['organization_id', 'fund_type'])
      t.dropColumn('description')
      t.dropColumn('created_by')
      t.dropColumn('updated_by')
    })

    this.s.alterTable('chart_of_accounts', (t) => {
      t.dropIndex(['organization_id', 'uacs_code'])
      t.dropIndex(['organization_id', 'sort_order'])
      t.dropColumn('uacs_code')
      t.dropColumn('description')
      t.dropColumn('contra_account_id')
      t.dropColumn('subsidiary_tag')
      t.dropColumn('sort_order')
      t.dropColumn('is_postable')
      t.dropColumn('created_by')
      t.dropColumn('updated_by')
    })
  }
}
