import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('documents', (table) => {
      table.text('content_html').nullable()
      table.string('source_type', 20).notNullable().defaultTo('upload')
      table.string('visibility', 20).notNullable().defaultTo('private')
    })

    this.schema.alterTable('document_versions', (table) => {
      table.text('content_html').nullable()
      table.string('source_type', 20).notNullable().defaultTo('upload')
    })
  }

  async down() {
    this.schema.alterTable('document_versions', (table) => {
      table.dropColumn('content_html')
      table.dropColumn('source_type')
    })

    this.schema.alterTable('documents', (table) => {
      table.dropColumn('content_html')
      table.dropColumn('source_type')
      table.dropColumn('visibility')
    })
  }
}
