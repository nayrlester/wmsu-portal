import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('attendance_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('member_id').nullable().references('id').inTable('members').onDelete('SET NULL')
      table.string('card_number', 50).notNullable()
      table.string('direction', 10).notNullable()
      table.string('source', 20).notNullable()
      table.timestamp('occurred_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['tenant_id', 'occurred_at'])
      table.index(['tenant_id', 'card_number'])
      table.index(['tenant_id', 'member_id'])
    })
  }

  async down() {
    this.schema.dropTable('attendance_events')
  }
}
