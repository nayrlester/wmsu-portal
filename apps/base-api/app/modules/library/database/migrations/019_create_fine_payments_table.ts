import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fine_payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('fine_id').notNullable().references('id').inTable('fines').onDelete('CASCADE')
      table.integer('amount_cents').notNullable()
      table.string('payment_method', 30).notNullable().defaultTo('cash')
      table.string('reference', 100).nullable()
      table.uuid('received_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('paid_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
