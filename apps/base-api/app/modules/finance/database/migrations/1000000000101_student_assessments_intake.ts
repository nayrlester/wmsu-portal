import { UimsSchema } from '../helpers/uims_schema.js'

/**
 * Thin UFMS intake for USiS assessment refs — not a full AR/ledger redesign.
 * Authoritative OR/payment posting remains cashier flows; this stores assessment
 * references and payment confirmation status for M2M sync.
 */
export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('student_assessments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('student_number', 64).notNullable()
      t.string('assessment_number', 64).notNullable()
      t.string('usis_assessment_id', 64).nullable()
      t.string('enrollment_ref', 64).nullable()
      t.decimal('tuition_fee', 12, 2).notNullable().defaultTo(0)
      t.decimal('misc_fees', 12, 2).notNullable().defaultTo(0)
      t.decimal('discount', 12, 2).notNullable().defaultTo(0)
      t.decimal('total_amount', 12, 2).notNullable()
      t.decimal('net_amount', 12, 2).notNullable()
      t.decimal('paid_amount', 12, 2).notNullable().defaultTo(0)
      t.string('payment_status', 32).notNullable().defaultTo('unpaid')
      t.jsonb('breakdown').nullable()
      t.string('idempotency_key', 180).notNullable()
      t.timestamp('assessed_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'assessment_number'])
      t.unique(['organization_id', 'idempotency_key'])
      t.index(['student_number'])
    })

    this.s.alterTable('student_payments', (t) => {
      t.string('assessment_number', 64).nullable()
      t.string('idempotency_key', 180).nullable()
    })
  }

  async down() {
    this.s.alterTable('student_payments', (t) => {
      t.dropColumn('assessment_number')
      t.dropColumn('idempotency_key')
    })
    this.s.dropTableIfExists('student_assessments')
  }
}
