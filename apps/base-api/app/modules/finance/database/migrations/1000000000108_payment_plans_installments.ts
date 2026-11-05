import { BaseSchema } from '@adonisjs/lucid/schema'

function uimsTable(name: string) {
  return `finance.${name}`
}

export default class extends BaseSchema {
  private get s() {
    return this.schema.withSchema('finance')
  }

  async up() {
    this.s.createTable('payment_plan_templates', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable()
      t.string('code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.string('plan_type', 32).notNullable()
      t.uuid('program_id').nullable()
      t.integer('year_level').nullable()
      t.string('classification', 40).nullable()
      t.decimal('downpayment_percent', 8, 2).nullable()
      t.jsonb('installments_json').notNullable().defaultTo(this.raw("'[]'::jsonb"))
      t.integer('monthly_count').nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('student_installments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable()
      t.uuid('student_assessment_id').notNullable().references('id').inTable(uimsTable('student_assessments')).onDelete('CASCADE')
      t.string('assessment_number', 64).notNullable()
      t.string('student_number', 64).notNullable()
      t.integer('sequence').notNullable()
      t.string('label', 120).notNullable()
      t.timestamp('due_date', { useTz: true }).nullable()
      t.decimal('amount', 12, 2).notNullable()
      t.decimal('paid_amount', 12, 2).notNullable().defaultTo(0)
      t.string('status', 32).notNullable().defaultTo('open')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'assessment_number'])
      t.index(['student_assessment_id'])
    })
  }

  async down() {
    this.s.dropTableIfExists('student_installments')
    this.s.dropTableIfExists('payment_plan_templates')
  }
}
