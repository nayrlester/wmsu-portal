import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('users', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('email', 255).notNullable()
      t.string('password', 255).notNullable()
      t.string('full_name', 255).notNullable()
      t.string('platform_user_id', 64).nullable()
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.timestamp('deleted_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'email'])
      t.index(['platform_user_id'])
    })

    this.s.createTable('permissions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.string('code', 120).notNullable().unique()
      t.string('name', 255).notNullable()
      t.string('module', 64).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('roles', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('slug', 64).notNullable()
      t.string('name', 255).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'slug'])
    })

    this.s.createTable('role_permissions', (t) => {
      t.uuid('role_id').notNullable().references('id').inTable(uimsTable('roles')).onDelete('CASCADE')
      t.uuid('permission_id').notNullable().references('id').inTable(uimsTable('permissions')).onDelete('CASCADE')
      t.primary(['role_id', 'permission_id'])
    })

    this.s.createTable('user_roles', (t) => {
      t.uuid('user_id').notNullable().references('id').inTable(uimsTable('users')).onDelete('CASCADE')
      t.uuid('role_id').notNullable().references('id').inTable(uimsTable('roles')).onDelete('CASCADE')
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.primary(['user_id', 'role_id', 'organization_id'])
    })

    this.s.createTable('auth_access_tokens', (t) => {
      t.increments('id')
      t.uuid('tokenable_id').notNullable().references('id').inTable(uimsTable('users')).onDelete('CASCADE')
      t.string('type', 40).notNullable()
      t.string('name', 255).nullable()
      t.string('hash', 64).notNullable()
      t.text('abilities').notNullable()
      t.timestamp('last_used_at', { useTz: true }).nullable()
      t.timestamp('expires_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.s.createTable('refresh_tokens', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('user_id').notNullable().references('id').inTable(uimsTable('users')).onDelete('CASCADE')
      t.string('token_hash', 128).notNullable().unique()
      t.timestamp('expires_at', { useTz: true }).notNullable()
      t.timestamp('revoked_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['user_id'])
    })
  }

  async down() {
    this.s.dropTableIfExists('refresh_tokens')
    this.s.dropTableIfExists('auth_access_tokens')
    this.s.dropTableIfExists('user_roles')
    this.s.dropTableIfExists('role_permissions')
    this.s.dropTableIfExists('roles')
    this.s.dropTableIfExists('permissions')
    this.s.dropTableIfExists('users')
  }
}
