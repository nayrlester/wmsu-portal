import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('code', 50).notNullable()
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      table.boolean('is_system').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.unique(['tenant_id', 'code'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
