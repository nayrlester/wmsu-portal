import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'member_borrowing_history'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table
        .uuid('member_id')
        .notNullable()
        .references('id')
        .inTable('members')
        .onDelete('CASCADE')

      table.uuid('book_id').nullable()
      table.string('book_title', 500).nullable()
      table.string('status', 30).notNullable().defaultTo('placeholder')
      table.timestamp('borrowed_at', { useTz: true }).nullable()
      table.timestamp('due_at', { useTz: true }).nullable()
      table.timestamp('returned_at', { useTz: true }).nullable()
      table.text('notes').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['member_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
