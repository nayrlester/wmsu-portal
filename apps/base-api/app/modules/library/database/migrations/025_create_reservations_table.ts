import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'reservations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')
      table.uuid('copy_id').nullable().references('id').inTable('book_copies').onDelete('SET NULL')

      table
        .enum('status', ['pending', 'ready', 'fulfilled', 'cancelled', 'expired'])
        .notNullable()
        .defaultTo('pending')

      table.integer('queue_position').nullable()
      table.timestamp('reserved_at', { useTz: true }).notNullable()
      table.timestamp('ready_at', { useTz: true }).nullable()
      table.timestamp('expires_at', { useTz: true }).nullable()
      table.timestamp('fulfilled_at', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.text('cancel_reason').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id', 'book_id', 'status'])
      table.index(['tenant_id', 'member_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
