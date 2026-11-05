import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.alterTable('sections', (t) => {
      t.boolean('waitlist_enabled').notNullable().defaultTo(false)
    })

    this.s.createTable('usis_section_meetings', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('section_id').notNullable().references('id').inTable(this.ref('sections')).onDelete('CASCADE')
      t.integer('day_of_week').notNullable()
      t.integer('start_minute').notNullable()
      t.integer('end_minute').notNullable()
      t.string('room_code', 64).nullable()
      t.uuid('faculty_user_id').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
    })

    this.s.createTable('usis_section_waitlist_entries', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('section_id').notNullable().references('id').inTable(this.ref('sections')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('enrollment_id').nullable().references('id').inTable(this.ref('enrollments')).onDelete('SET NULL')
      t.integer('position').notNullable()
      t.string('status', 24).notNullable().defaultTo('waiting')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.s.dropTable('usis_section_waitlist_entries')
    this.s.dropTable('usis_section_meetings')
    this.s.alterTable('sections', (t) => {
      t.dropColumn('waitlist_enabled')
    })
  }
}
