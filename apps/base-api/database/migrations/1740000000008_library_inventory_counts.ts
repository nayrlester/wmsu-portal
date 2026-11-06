import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected schemaName = 'library'

  async up() {
    const schema = this.schema.withSchema(this.schemaName)
    schema.createTable('inventory_counts', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('library.tenants')
        .onDelete('CASCADE')
      table.string('shelf_code', 100).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['tenant_id', 'created_at'])
    })

    schema.createTable('inventory_count_lines', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('library.tenants')
        .onDelete('CASCADE')
      table
        .uuid('count_id')
        .notNullable()
        .references('id')
        .inTable('library.inventory_counts')
        .onDelete('CASCADE')
      table.string('scanned_value', 100).notNullable()
      table.uuid('copy_id').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['count_id'])
    })
  }

  async down() {
    const schema = this.schema.withSchema(this.schemaName)
    schema.dropTable('inventory_count_lines')
    schema.dropTable('inventory_counts')
  }
}
