import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('saved_searches', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 200).notNullable()
      table.string('query', 500).notNullable().defaultTo('')
      table.jsonb('filters').notNullable().defaultTo('{}')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id', 'user_id'])
    })

    this.schema.createTable('recent_searches', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('query', 500).notNullable().defaultTo('')
      table.jsonb('filters').notNullable().defaultTo('{}')
      table.timestamp('searched_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id', 'user_id', 'searched_at'])
    })
  }

  async down() {
    this.schema.dropTable('recent_searches')
    this.schema.dropTable('saved_searches')
  }
}
