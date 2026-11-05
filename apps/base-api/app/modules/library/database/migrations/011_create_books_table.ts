import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')

      table.string('isbn13', 13).nullable()
      table.string('isbn10', 10).nullable()
      table.string('catalog_barcode', 50).nullable()
      table.string('title', 500).notNullable()
      table.string('subtitle', 500).nullable()
      table.string('genre', 100).nullable()

      table.uuid('publisher_id').nullable().references('id').inTable('publishers').onDelete('SET NULL')
      table.uuid('category_id').nullable().references('id').inTable('categories').onDelete('SET NULL')

      table.text('description').nullable()
      table.boolean('is_digital').notNullable().defaultTo(false)
      table.string('cover_image_url', 500).nullable()

      // Denormalized search fields (Phase 5 FTS will use these)
      table.text('author_names').nullable()
      table.text('search_text').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
      table.index(['tenant_id', 'isbn13'])
      table.index(['tenant_id', 'catalog_barcode'])
      table.unique(['tenant_id', 'isbn13'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
