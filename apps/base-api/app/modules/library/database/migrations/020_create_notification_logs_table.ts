import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('event_type', 50).notNullable()
      table.string('channel', 20).notNullable().defaultTo('in_app')
      table.string('recipient_type', 30).notNullable()
      table.uuid('recipient_id').nullable()
      table.string('title', 300).notNullable()
      table.text('body').notNullable()
      table.jsonb('payload').notNullable().defaultTo('{}')
      table
        .enum('status', ['pending', 'sent', 'failed'])
        .notNullable()
        .defaultTo('pending')
      table.timestamp('sent_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['tenant_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
