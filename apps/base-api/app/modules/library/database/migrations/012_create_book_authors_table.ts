import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'book_authors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')
      table.uuid('author_id').notNullable().references('id').inTable('authors').onDelete('CASCADE')
      table.smallint('sort_order').notNullable().defaultTo(0)
      table.primary(['book_id', 'author_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
