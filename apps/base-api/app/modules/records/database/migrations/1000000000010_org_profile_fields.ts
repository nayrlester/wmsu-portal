import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.schema.raw(`
      ALTER TABLE ${uimsTable('organizations')}
        ADD COLUMN IF NOT EXISTS address varchar(500) NULL,
        ADD COLUMN IF NOT EXISTS contact_email varchar(255) NULL,
        ADD COLUMN IF NOT EXISTS contact_phone varchar(64) NULL
    `)

    this.schema.raw(`
      ALTER TABLE ${uimsTable('departments')}
        ADD COLUMN IF NOT EXISTS head_name varchar(255) NULL
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE ${uimsTable('organizations')}
        DROP COLUMN IF EXISTS address,
        DROP COLUMN IF EXISTS contact_email,
        DROP COLUMN IF EXISTS contact_phone
    `)
    this.schema.raw(`
      ALTER TABLE ${uimsTable('departments')}
        DROP COLUMN IF EXISTS head_name
    `)
  }
}
