import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('record_number_sequences', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('sequence_name', 40).notNullable()
      table.integer('year').notNullable()
      table.integer('last_number').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'sequence_name', 'year'])
    })

    this.schema.createTable('record_requests', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('request_number', 40).notNullable()
      table.string('status', 40).notNullable().defaultTo('pending')
      table
        .uuid('requesting_office_id')
        .nullable()
        .references('id')
        .inTable('departments')
        .onDelete('SET NULL')
      table.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table
        .uuid('approver_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .uuid('fulfilled_by_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('purpose').notNullable()
      table.string('access_mode', 40).notNullable().defaultTo('view_only')
      table.timestamp('needed_by', { useTz: true }).nullable()
      table.timestamp('due_at', { useTz: true }).nullable()
      table.text('denial_reason').nullable()
      table.text('notes').nullable()
      table.timestamp('approved_at', { useTz: true }).nullable()
      table.timestamp('released_at', { useTz: true }).nullable()
      table.timestamp('returned_at', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'request_number'])
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'requester_id'])
      table.index(['tenant_id', 'due_at'])
    })

    this.schema.createTable('record_request_items', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table
        .uuid('record_request_id')
        .notNullable()
        .references('id')
        .inTable('record_requests')
        .onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('RESTRICT')
      table.string('status', 40).notNullable().defaultTo('pending')
      table.text('notes').nullable()
      table.timestamp('released_at', { useTz: true }).nullable()
      table.timestamp('returned_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['record_request_id', 'document_id'])
      table.index(['tenant_id', 'document_id'])
      table.index(['tenant_id', 'status'])
    })

    this.schema.createTable('release_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table
        .uuid('record_request_id')
        .notNullable()
        .references('id')
        .inTable('record_requests')
        .onDelete('CASCADE')
      table
        .uuid('record_request_item_id')
        .nullable()
        .references('id')
        .inTable('record_request_items')
        .onDelete('SET NULL')
      table.uuid('document_id').nullable().references('id').inTable('documents').onDelete('SET NULL')
      table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('event_type', 40).notNullable()
      table.text('notes').nullable()
      table.jsonb('metadata').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id', 'record_request_id'])
      table.index(['tenant_id', 'event_type'])
      table.index(['tenant_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable('release_events')
    this.schema.dropTable('record_request_items')
    this.schema.dropTable('record_requests')
    this.schema.dropTable('record_number_sequences')
  }
}
