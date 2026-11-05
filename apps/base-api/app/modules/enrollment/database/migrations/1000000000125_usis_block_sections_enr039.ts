import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('sections')}
      ADD COLUMN IF NOT EXISTS block_group_code character varying(64) NULL
    `)
    this.schema.raw(`
      CREATE INDEX IF NOT EXISTS sections_org_block_group_idx
      ON ${this.ref('sections')} (organization_id, academic_year_id, block_group_code)
    `)
  }

  async down() {
    this.schema.raw(`DROP INDEX IF EXISTS ${this.ref('sections_org_block_group_idx')}`)
    this.schema.raw(`
      ALTER TABLE ${this.ref('sections')}
      DROP COLUMN IF EXISTS block_group_code
    `)
  }
}
