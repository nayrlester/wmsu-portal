import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('approvals', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('workflow_instance_id').nullable().references('id').inTable('document_workflow_instances').onDelete('SET NULL')
      table.uuid('approver_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.string('action', 30).notNullable()
      table.text('comments').nullable()
      table.string('step_node_id', 100).nullable()
      table.timestamp('acted_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['document_id'])
      table.index(['approver_id'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('routing_entries', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('from_user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('to_user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('from_department_id').nullable().references('id').inTable('departments').onDelete('SET NULL')
      table.uuid('to_department_id').nullable().references('id').inTable('departments').onDelete('SET NULL')
      table.string('action', 50).notNullable()
      table.text('remarks').nullable()
      table.timestamp('routed_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['document_id'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('comments', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.text('body').notNullable()
      table.jsonb('mentions').nullable()
      table.uuid('parent_id').nullable().references('id').inTable('comments').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.index(['document_id'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('comment_attachments', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('comment_id').notNullable().references('id').inTable('comments').onDelete('CASCADE')
      table.string('file_name', 500).notNullable()
      table.string('s3_key', 1000).notNullable()
      table.string('mime_type', 100).notNullable()
      table.bigInteger('file_size').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })

    this.schema.createTable('document_followers', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['document_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable('document_followers')
    this.schema.dropTable('comment_attachments')
    this.schema.dropTable('comments')
    this.schema.dropTable('routing_entries')
    this.schema.dropTable('approvals')
  }
}
