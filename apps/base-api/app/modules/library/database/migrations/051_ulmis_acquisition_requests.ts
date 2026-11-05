import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'acquisition_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('request_number', 64).notNullable()
      table
        .string('status', 32)
        .notNullable()
        .defaultTo('draft')
      table.uuid('member_id').nullable().references('id').inTable('members').onDelete('SET NULL')
      table.uuid('book_id').nullable().references('id').inTable('books').onDelete('SET NULL')
      table.uuid('cataloged_book_id').nullable().references('id').inTable('books').onDelete('SET NULL')
      table.string('title', 500).notNullable()
      table.string('authors', 500).nullable()
      table.string('isbn_13', 20).nullable()
      table.string('material_type', 64).nullable()
      table.string('publisher_name', 255).nullable()
      table.integer('publication_year').nullable()
      table.integer('quantity').notNullable().defaultTo(1)
      table.text('justification').nullable()
      table.string('requesting_unit', 255).nullable()
      table.string('ufms_pr_ref', 128).nullable()
      table.uuid('outbox_id').nullable().references('id').inTable('ulmis_integration_outbox').onDelete('SET NULL')
      table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('submitted_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('routed_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('cancelled_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('submitted_at', { useTz: true }).nullable()
      table.timestamp('routed_at', { useTz: true }).nullable()
      table.timestamp('acknowledged_at', { useTz: true }).nullable()
      table.timestamp('cataloged_at', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.text('cancel_reason').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'request_number'])
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'created_at'])
      table.index(['tenant_id', 'member_id'])
      table.index(['tenant_id', 'ufms_pr_ref'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
