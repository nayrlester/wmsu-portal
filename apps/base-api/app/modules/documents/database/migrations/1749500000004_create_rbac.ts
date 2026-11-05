import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('roles', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.string('slug', 100).notNullable()
      table.text('description').nullable()
      table.boolean('is_system').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'slug'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('permissions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name', 100).notNullable()
      table.string('slug', 100).notNullable().unique()
      table.string('module', 50).notNullable()
      table.text('description').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })

    this.schema.createTable('role_permissions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE')
      table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['role_id', 'permission_id'])
    })

    this.schema.createTable('user_roles', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE')
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['user_id', 'role_id', 'tenant_id'])
      table.index(['user_id'])
      table.index(['tenant_id'])
    })
  }

  async down() {
    this.schema.dropTable('user_roles')
    this.schema.dropTable('role_permissions')
    this.schema.dropTable('permissions')
    this.schema.dropTable('roles')
  }
}
