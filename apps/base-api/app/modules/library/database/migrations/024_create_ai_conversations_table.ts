import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ai_conversations', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('title', 300).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['tenant_id', 'user_id', 'updated_at'])
    })

    this.schema.createTable('ai_messages', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('conversation_id')
        .notNullable()
        .references('id')
        .inTable('ai_conversations')
        .onDelete('CASCADE')
      table.enum('role', ['user', 'assistant', 'system']).notNullable()
      table.text('content').notNullable()
      table.jsonb('tool_calls').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['conversation_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable('ai_messages')
    this.schema.dropTable('ai_conversations')
  }
}
