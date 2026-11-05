import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fines'

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
      table.uuid('borrowing_id').nullable().references('id').inTable('borrowings').onDelete('SET NULL')

      table.string('reason', 50).notNullable()
      table.integer('amount_cents').notNullable()
      table.integer('paid_cents').notNullable().defaultTo(0)
      table.integer('waived_cents').notNullable().defaultTo(0)

      table
        .enum('status', ['pending', 'partial', 'paid', 'waived'])
        .notNullable()
        .defaultTo('pending')

      table.timestamp('assessed_at', { useTz: true }).notNullable()
      table.timestamp('due_at', { useTz: true }).nullable()
      table.timestamp('waived_at', { useTz: true }).nullable()
      table.uuid('waived_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.text('waive_reason').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id', 'member_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
