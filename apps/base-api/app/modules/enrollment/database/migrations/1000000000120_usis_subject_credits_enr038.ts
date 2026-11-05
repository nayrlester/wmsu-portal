import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('student_subject_credits')}
      ADD COLUMN IF NOT EXISTS external_subject_code varchar(64) NULL,
      ADD COLUMN IF NOT EXISTS external_subject_title varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS notes text NULL,
      ADD COLUMN IF NOT EXISTS reviewed_by uuid NULL,
      ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL
    `)

    this.s.createTable('usis_subject_equivalencies', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('internal_subject_id').notNullable().references('id').inTable(this.ref('subjects')).onDelete('CASCADE')
      t.string('external_code', 64).notNullable()
      t.string('external_title', 255).nullable()
      t.string('source_school', 255).nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'internal_subject_id', 'external_code'])
      t.index(['organization_id', 'external_code'])
    })
  }

  async down() {
    this.s.dropTable('usis_subject_equivalencies')
    this.schema.raw(`
      ALTER TABLE ${this.ref('student_subject_credits')}
      DROP COLUMN IF EXISTS external_subject_code,
      DROP COLUMN IF EXISTS external_subject_title,
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS reviewed_by,
      DROP COLUMN IF EXISTS reviewed_at,
      DROP COLUMN IF EXISTS updated_at
    `)
  }
}
