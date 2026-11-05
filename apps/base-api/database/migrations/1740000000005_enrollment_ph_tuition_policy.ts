import { BaseSchema } from '@adonisjs/lucid/schema'

function enrollmentTable(table: string) {
  return `enrollment.${table}`
}

export default class extends BaseSchema {
  protected schemaName = 'enrollment'

  async up() {
    const s = this.schema.withSchema(this.schemaName)
    s.alterTable('fee_schedules', (t) => {
      t.uuid('program_id')
        .nullable()
        .references('id')
        .inTable(enrollmentTable('programs'))
        .onDelete('SET NULL')
    })
    s.createTable('enrollment_payment_policies', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id')
        .notNullable()
        .references('id')
        .inTable(enrollmentTable('organizations'))
        .onDelete('CASCADE')
      t.string('minimum_due_mode', 40).notNullable().defaultTo('full_net')
      t.decimal('downpayment_percent', 8, 2).nullable()
      t.uuid('default_payment_plan_template_id').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id'])
    })
  }

  async down() {
    const s = this.schema.withSchema(this.schemaName)
    s.dropTableIfExists('enrollment_payment_policies')
    s.alterTable('fee_schedules', (t) => {
      t.dropColumn('program_id')
    })
  }
}
