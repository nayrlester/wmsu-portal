import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_clearance_reports', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('student_number', 64).notNullable()
      t.uuid('document_token').notNullable().unique()
      t.string('snapshot_checksum', 64).notNullable()
      t.text('snapshot_json').notNullable()
      t.boolean('cleared').notNullable()
      t.uuid('issued_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('issued_at', { useTz: true }).notNullable()
      t.timestamp('revoked_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
    })
    this.s.raw(`CREATE INDEX usis_clearance_reports_student_idx ON ${this.ref('usis_clearance_reports')} (organization_id, student_id, issued_at DESC)`)
  }

  async down() {
    this.s.dropTable('usis_clearance_reports')
  }
}
