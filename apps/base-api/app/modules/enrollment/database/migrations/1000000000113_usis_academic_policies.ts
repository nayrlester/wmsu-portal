import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_academic_policies', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().unique().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.jsonb('enrollment_approval_steps').notNullable().defaultTo(this.raw(`'["adviser","assessment","registrar"]'::jsonb`))
      t.string('grade_display_mode', 32).notNullable().defaultTo('after_deadline')
      t.jsonb('grade_document_signatories').notNullable().defaultTo(this.raw(`'[]'::jsonb`))
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.s.dropTable('usis_academic_policies')
  }
}
