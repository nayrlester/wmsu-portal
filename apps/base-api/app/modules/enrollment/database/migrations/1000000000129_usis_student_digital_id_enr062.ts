import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private get s() {
    return this.schema.withSchema('enrollment')
  }

  async up() {
    this.s.alterTable('student_id_requests', (t) => {
      t.uuid('digital_document_token').nullable().unique()
      t.string('digital_snapshot_checksum', 64).nullable()
      t.jsonb('digital_snapshot_json').nullable()
      t.timestamp('digital_issued_at', { useTz: true }).nullable()
      t.uuid('digital_issued_by').nullable().references('id').inTable('enrollment.users').onDelete('SET NULL')
    })
  }

  async down() {
    this.s.alterTable('student_id_requests', (t) => {
      t.dropColumn('digital_document_token')
      t.dropColumn('digital_snapshot_checksum')
      t.dropColumn('digital_snapshot_json')
      t.dropColumn('digital_issued_at')
      t.dropColumn('digital_issued_by')
    })
  }
}
