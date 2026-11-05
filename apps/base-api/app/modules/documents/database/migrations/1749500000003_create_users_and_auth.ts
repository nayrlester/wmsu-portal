import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('email', 254).notNullable()
      table.string('password').notNullable()
      table.string('full_name', 255).nullable()
      table.string('avatar_url', 500).nullable()
      table.string('phone', 30).nullable()
      table.string('status', 30).notNullable().defaultTo('active')
      table.boolean('is_super_admin').notNullable().defaultTo(false)
      table.boolean('email_verified').notNullable().defaultTo(false)
      table.timestamp('email_verified_at', { useTz: true }).nullable()
      table.string('mfa_secret', 255).nullable()
      table.boolean('mfa_enabled').notNullable().defaultTo(false)
      table.string('oauth_provider', 50).nullable()
      table.string('oauth_provider_id', 255).nullable()
      table.timestamp('last_login_at', { useTz: true }).nullable()
      table.string('last_login_ip', 45).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.unique(['email'])
      table.index(['tenant_id'])
      table.index(['status'])
    })

    this.schema.createTable('auth_access_tokens', (table) => {
      table.increments('id')
      table.uuid('tokenable_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable()
      table.text('abilities').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.timestamp('last_used_at', { useTz: true }).nullable()
      table.timestamp('expires_at', { useTz: true }).nullable()

      table.index(['tokenable_id'])
    })

    this.schema.createTable('refresh_tokens', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token_hash', 255).notNullable().unique()
      table.string('user_agent', 500).nullable()
      table.string('ip_address', 45).nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('revoked_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['user_id'])
      table.index(['expires_at'])
    })

    this.schema.createTable('password_reset_tokens', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token_hash', 255).notNullable().unique()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('used_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })

    this.schema.createTable('email_verification_tokens', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token_hash', 255).notNullable().unique()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('used_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable('email_verification_tokens')
    this.schema.dropTable('password_reset_tokens')
    this.schema.dropTable('refresh_tokens')
    this.schema.dropTable('auth_access_tokens')
    this.schema.dropTable('users')
  }
}
