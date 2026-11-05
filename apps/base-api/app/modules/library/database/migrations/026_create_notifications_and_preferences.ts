import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

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
      table.string('recipient_type', 30).notNullable()
      table.uuid('recipient_id').nullable()
      table.string('title', 300).notNullable()
      table.text('body').notNullable()
      table.jsonb('payload').notNullable().defaultTo('{}')
      table.timestamp('read_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id', 'recipient_type', 'recipient_id', 'created_at'])
      table.index(['tenant_id', 'recipient_id', 'read_at'])
    })

    this.schema.createTable('notification_preferences', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('owner_type', 30).notNullable()
      table.uuid('owner_id').notNullable()
      table.string('event_type', 50).notNullable()
      table.boolean('email_enabled').notNullable().defaultTo(true)
      table.boolean('in_app_enabled').notNullable().defaultTo(true)
      table.boolean('sms_enabled').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'owner_type', 'owner_id', 'event_type'])
    })
  }

  async down() {
    this.schema.dropTable('notification_preferences')
    this.schema.dropTable(this.tableName)
  }
}
