import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'document_versions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('version_minor').notNullable().defaultTo(0)
    })

    this.schema.raw(`
      ALTER TABLE document_versions
      DROP CONSTRAINT IF EXISTS document_versions_document_id_version_number_unique
    `)

    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['document_id', 'version_number', 'version_minor'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['document_id', 'version_number', 'version_minor'])
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['document_id', 'version_number'])
      table.dropColumn('version_minor')
    })
  }
}
