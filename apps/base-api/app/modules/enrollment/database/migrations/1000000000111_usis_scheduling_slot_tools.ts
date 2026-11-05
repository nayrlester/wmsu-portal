import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_scheduling_notifications', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('section_id').nullable().references('id').inTable(this.ref('sections')).onDelete('SET NULL')
      t.uuid('student_id').nullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('faculty_user_id').nullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.string('event_type', 64).notNullable()
      t.string('title', 255).notNullable()
      t.text('body').notNullable()
      t.timestamp('read_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.s.dropTable('usis_scheduling_notifications')
  }
}
