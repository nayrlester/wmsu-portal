import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'borrowings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')

      table.string('transaction_number', 30).notNullable()
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')
      table.uuid('copy_id').nullable().references('id').inTable('book_copies').onDelete('SET NULL')

      table
        .enum('status', ['requested', 'approved', 'borrowed', 'returned', 'overdue', 'lost'])
        .notNullable()
        .defaultTo('requested')

      table.timestamp('requested_at', { useTz: true }).notNullable()
      table.timestamp('approved_at', { useTz: true }).nullable()
      table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL')

      table.timestamp('borrowed_at', { useTz: true }).nullable()
      table.timestamp('due_at', { useTz: true }).nullable()
      table.timestamp('returned_at', { useTz: true }).nullable()
      table.uuid('checked_out_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('returned_by').nullable().references('id').inTable('users').onDelete('SET NULL')

      table.timestamp('lost_at', { useTz: true }).nullable()
      table.uuid('lost_reported_by').nullable().references('id').inTable('users').onDelete('SET NULL')

      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'transaction_number'])
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'member_id'])
      table.index(['tenant_id', 'due_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
