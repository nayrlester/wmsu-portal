import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('document_file_plan_nodes', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table
        .uuid('parent_id')
        .nullable()
        .references('id')
        .inTable('document_file_plan_nodes')
        .onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('code', 80).nullable()
      table.string('path', 1000).notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'path'])
      table.index(['tenant_id', 'parent_id'])
      table.index(['tenant_id', 'is_active'])
    })

    this.schema.alterTable('documents', (table) => {
      table
        .uuid('file_plan_node_id')
        .nullable()
        .references('id')
        .inTable('document_file_plan_nodes')
        .onDelete('SET NULL')
      table.index(['file_plan_node_id'])
    })
  }

  async down() {
    this.schema.alterTable('documents', (table) => {
      table.dropIndex(['file_plan_node_id'])
      table.dropColumn('file_plan_node_id')
    })
    this.schema.dropTable('document_file_plan_nodes')
  }
}
