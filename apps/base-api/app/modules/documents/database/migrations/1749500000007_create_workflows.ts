import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('workflows', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.string('status', 30).notNullable().defaultTo('draft')
      table.integer('version').notNullable().defaultTo(1)
      table.jsonb('definition').notNullable()
      table.uuid('created_by_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.timestamp('published_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
      table.index(['status'])
    })

    this.schema.alterTable('document_types', (table) => {
      table.foreign('default_workflow_id').references('id').inTable('workflows').onDelete('SET NULL')
    })

    this.schema.alterTable('documents', (table) => {
      table.foreign('current_workflow_id').references('id').inTable('workflows').onDelete('SET NULL')
    })

    this.schema.createTable('workflow_steps', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('workflow_id').notNullable().references('id').inTable('workflows').onDelete('CASCADE')
      table.string('node_id', 100).notNullable()
      table.string('name', 255).notNullable()
      table.string('step_type', 50).notNullable()
      table.integer('order_index').notNullable()
      table.uuid('assignee_role_id').nullable().references('id').inTable('roles').onDelete('SET NULL')
      table.uuid('assignee_user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('assignee_department_id').nullable().references('id').inTable('departments').onDelete('SET NULL')
      table.jsonb('conditions').nullable()
      table.integer('sla_hours').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['workflow_id', 'node_id'])
      table.index(['workflow_id'])
    })

    this.schema.createTable('document_workflow_instances', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('workflow_id').notNullable().references('id').inTable('workflows').onDelete('RESTRICT')
      table.string('status', 30).notNullable().defaultTo('active')
      table.string('current_node_id', 100).nullable()
      table.jsonb('state').nullable()
      table.timestamp('started_at', { useTz: true }).notNullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['document_id'])
      table.index(['tenant_id'])
    })
  }

  async down() {
    this.schema.dropTable('document_workflow_instances')
    this.schema.dropTable('workflow_steps')
    this.schema.alterTable('documents', (table) => {
      table.dropForeign(['current_workflow_id'])
    })
    this.schema.alterTable('document_types', (table) => {
      table.dropForeign(['default_workflow_id'])
    })
    this.schema.dropTable('workflows')
  }
}
