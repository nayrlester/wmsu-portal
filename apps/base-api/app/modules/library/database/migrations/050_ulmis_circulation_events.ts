import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'circulation_events'

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
        .uuid('borrowing_id')
        .nullable()
        .references('id')
        .inTable('borrowings')
        .onDelete('SET NULL')
      table.uuid('book_id').nullable().references('id').inTable('books').onDelete('SET NULL')
      table
        .uuid('copy_id')
        .nullable()
        .references('id')
        .inTable('book_copies')
        .onDelete('SET NULL')
      table
        .uuid('member_id')
        .nullable()
        .references('id')
        .inTable('members')
        .onDelete('SET NULL')
      table.string('event_type', 64).notNullable()
      table.string('channel', 32).notNullable().defaultTo('desk')
      table.uuid('actor_user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.jsonb('payload').notNullable().defaultTo('{}')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id', 'created_at'])
      table.index(['tenant_id', 'borrowing_id'])
      table.index(['tenant_id', 'event_type'])
      table.index(['tenant_id', 'member_id'])
    })

    this.schema.createTable('loan_renewals', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table
        .uuid('borrowing_id')
        .notNullable()
        .references('id')
        .inTable('borrowings')
        .onDelete('CASCADE')
      table.integer('renewal_number').notNullable()
      table.timestamp('previous_due_at', { useTz: true }).nullable()
      table.timestamp('new_due_at', { useTz: true }).notNullable()
      table.uuid('renewed_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.unique(['borrowing_id', 'renewal_number'])
      table.index(['tenant_id', 'borrowing_id'])
    })
  }

  async down() {
    this.schema.dropTable('loan_renewals')
    this.schema.dropTable(this.tableName)
  }
}
