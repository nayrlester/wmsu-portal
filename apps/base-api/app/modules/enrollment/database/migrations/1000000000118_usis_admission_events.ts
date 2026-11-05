import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_admission_events', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('event_type', 32).notNullable()
      t.string('title', 255).notNullable()
      t.timestamp('scheduled_at', { useTz: true }).notNullable()
      t.string('location', 255).nullable()
      t.integer('capacity').nullable()
      t.text('notes').nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'event_type'])
      t.index(['organization_id', 'scheduled_at'])
    })

    this.s.createTable('usis_admission_event_results', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('event_id').notNullable().references('id').inTable(this.ref('usis_admission_events')).onDelete('CASCADE')
      t.uuid('applicant_id').notNullable().references('id').inTable(this.ref('applicants')).onDelete('CASCADE')
      t.decimal('score', 8, 2).nullable()
      t.string('result', 32).notNullable().defaultTo('pending')
      t.text('remarks').nullable()
      t.uuid('recorded_by').nullable()
      t.timestamp('recorded_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['event_id', 'applicant_id'])
      t.index(['applicant_id'])
    })

    this.s.createTable('usis_applicant_status_history', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('applicant_id').notNullable().references('id').inTable(this.ref('applicants')).onDelete('CASCADE')
      t.string('from_status', 32).nullable()
      t.string('to_status', 32).notNullable()
      t.string('note', 500).nullable()
      t.uuid('actor_user_id').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.index(['applicant_id', 'created_at'])
    })
  }

  async down() {
    this.s.dropTable('usis_applicant_status_history')
    this.s.dropTable('usis_admission_event_results')
    this.s.dropTable('usis_admission_events')
  }
}
