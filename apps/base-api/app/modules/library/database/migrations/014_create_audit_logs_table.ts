import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .nullable()
        .references('id')
        .inTable('tenants')
        .onDelete('SET NULL')
      table.uuid('user_id').nullable()
      table.string('user_email', 255).nullable()
      table.string('action', 50).notNullable()
      table.string('resource_type', 50).notNullable()
      table.uuid('resource_id').nullable()
      table.jsonb('old_values').nullable()
      table.jsonb('new_values').nullable()
      table.string('ip_address', 45).nullable()
      table.string('request_id', 50).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id', 'created_at'])
      table.index(['resource_type', 'resource_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
