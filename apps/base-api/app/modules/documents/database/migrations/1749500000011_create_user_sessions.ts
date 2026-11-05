import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('user_sessions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .uuid('refresh_token_id')
        .nullable()
        .references('id')
        .inTable('refresh_tokens')
        .onDelete('SET NULL')
      table.string('ip_address', 45).nullable()
      table.string('user_agent', 500).nullable()
      table.string('device_label', 255).nullable()
      table.string('location', 255).nullable()
      table.timestamp('last_active_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('revoked_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['user_id'])
      table.index(['expires_at'])
      table.index(['user_id', 'revoked_at'])
    })

    this.schema.alterTable('refresh_tokens', (table) => {
      table.string('device_label', 255).nullable()
      table.timestamp('last_active_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable('refresh_tokens', (table) => {
      table.dropColumn('device_label')
      table.dropColumn('last_active_at')
    })
    this.schema.dropTable('user_sessions')
  }
}
