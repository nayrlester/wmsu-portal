import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.alterTable('fee_schedules', (t) => {
      t.uuid('program_id')
        .nullable()
        .references('id')
        .inTable(this.ref('programs'))
        .onDelete('SET NULL')
    })

    this.s.createTable('enrollment_payment_policies', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('minimum_due_mode', 40).notNullable().defaultTo('full_net')
      t.decimal('downpayment_percent', 8, 2).nullable()
      t.uuid('default_payment_plan_template_id').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id'])
    })
  }

  async down() {
    this.s.dropTableIfExists('enrollment_payment_policies')
    this.s.alterTable('fee_schedules', (t) => {
      t.dropColumn('program_id')
    })
  }
}
