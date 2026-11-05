import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'book_copies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')

      table.string('barcode', 50).notNullable()
      table.smallint('copy_number').notNullable().defaultTo(1)
      table
        .enum('status', [
          'available',
          'on_loan',
          'reserved',
          'maintenance',
          'lost',
          'withdrawn',
        ])
        .notNullable()
        .defaultTo('available')
      table.string('shelf_location', 100).nullable()
      table.string('condition', 20).nullable().defaultTo('good')
      table.text('notes').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'barcode'])
      table.index(['book_id'])
      table.index(['tenant_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
