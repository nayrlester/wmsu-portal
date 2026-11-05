import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_student_profile_violations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('violation_code', 64).notNullable()
      t.string('title', 255).notNullable()
      t.text('description').nullable()
      t.string('status', 32).notNullable().defaultTo('recorded')
      t.timestamp('occurred_at', { useTz: true }).nullable()
      t.uuid('recorded_by').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'student_id', 'created_at'])
      t.index(['student_id', 'status'])
    })
  }

  async down() {
    this.s.dropTable('usis_student_profile_violations')
  }
}
