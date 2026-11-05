import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('documents', (table) => {
      table.string('physical_box_id', 120).nullable()
      table.string('physical_folder_id', 120).nullable()
      table.string('receiving_channel', 40).nullable()
      table.string('receipt_number', 40).nullable()
      table.string('ocr_qa_status', 40).nullable()
      table.jsonb('indexing_checklist').nullable()

      table.index(['physical_box_id'])
      table.index(['receipt_number'])
      table.index(['receiving_channel'])
      table.index(['ocr_qa_status'])
    })

    this.schema.createTable('digitization_batches', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('batch_number', 40).notNullable()
      table.string('title', 255).notNullable()
      table.string('status', 40).notNullable().defaultTo('open')
      table.text('notes').nullable()
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'batch_number'])
      table.index(['tenant_id', 'status'])
    })

    this.schema.createTable('digitization_batch_items', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table
        .uuid('batch_id')
        .notNullable()
        .references('id')
        .inTable('digitization_batches')
        .onDelete('CASCADE')
      table.uuid('document_id').nullable().references('id').inTable('documents').onDelete('SET NULL')
      table.string('label', 255).notNullable()
      table.string('status', 40).notNullable().defaultTo('queued')
      table.string('ocr_qa_status', 40).notNullable().defaultTo('pending')
      table.jsonb('indexing_checklist').notNullable().defaultTo('[]')
      table.string('physical_box_id', 120).nullable()
      table.string('physical_folder_id', 120).nullable()
      table.text('qa_notes').nullable()
      table.uuid('qa_reviewed_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('qa_reviewed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id', 'batch_id'])
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'ocr_qa_status'])
    })

    this.schema.createTable('receiving_receipts', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('receipt_number', 40).notNullable()
      table.string('channel', 40).notNullable().defaultTo('walk_in')
      table.string('status', 40).notNullable().defaultTo('logged')
      table.timestamp('received_at', { useTz: true }).notNullable()
      table.uuid('received_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table
        .uuid('originating_office_id')
        .nullable()
        .references('id')
        .inTable('departments')
        .onDelete('SET NULL')
      table
        .uuid('receiving_office_id')
        .nullable()
        .references('id')
        .inTable('departments')
        .onDelete('SET NULL')
      table.string('sender_name', 255).nullable()
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.string('physical_box_id', 120).nullable()
      table.string('physical_folder_id', 120).nullable()
      table.uuid('document_id').nullable().references('id').inTable('documents').onDelete('SET NULL')
      table.text('acknowledgment_notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'receipt_number'])
      table.index(['tenant_id', 'channel'])
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'received_at'])
    })
  }

  async down() {
    this.schema.dropTable('receiving_receipts')
    this.schema.dropTable('digitization_batch_items')
    this.schema.dropTable('digitization_batches')
    this.schema.alterTable('documents', (table) => {
      table.dropColumn('physical_box_id')
      table.dropColumn('physical_folder_id')
      table.dropColumn('receiving_channel')
      table.dropColumn('receipt_number')
      table.dropColumn('ocr_qa_status')
      table.dropColumn('indexing_checklist')
    })
  }
}
