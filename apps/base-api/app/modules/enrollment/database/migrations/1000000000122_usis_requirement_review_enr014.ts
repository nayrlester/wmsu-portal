import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('student_deficiencies')}
      ADD COLUMN IF NOT EXISTS review_notes text NULL,
      ADD COLUMN IF NOT EXISTS reviewed_by uuid NULL,
      ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('student_deficiencies')}
      DROP COLUMN IF EXISTS review_notes,
      DROP COLUMN IF EXISTS reviewed_by,
      DROP COLUMN IF EXISTS reviewed_at,
      DROP COLUMN IF EXISTS deleted_at
    `)
  }
}
