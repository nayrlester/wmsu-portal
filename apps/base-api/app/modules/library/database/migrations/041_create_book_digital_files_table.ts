import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('book_digital_files', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')
      table.uuid('platform_document_id').notNullable()
      table.string('original_name', 255).notNullable()
      table.string('content_type', 120).nullable()
      table.bigInteger('size_bytes').notNullable().defaultTo(0)
      table.uuid('uploaded_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id', 'book_id'])
      table.index(['platform_document_id'])
    })
  }

  async down() {
    this.schema.dropTable('book_digital_files')
  }
}
