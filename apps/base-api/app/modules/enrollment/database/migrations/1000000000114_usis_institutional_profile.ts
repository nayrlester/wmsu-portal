import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_institutional_profiles', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().unique().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('legal_name', 255).notNullable()
      t.string('display_name', 255).nullable()
      t.string('logo_url', 512).nullable()
      t.jsonb('signatories').notNullable().defaultTo(this.raw(`'[]'::jsonb`))
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.s.dropTable('usis_institutional_profiles')
  }
}
