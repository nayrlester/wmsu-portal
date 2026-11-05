import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Enterprise remediation: digitization ingest fields, legal hold,
 * archival transfer packages, and disposal requests.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('digitization_batch_items', (table) => {
      table.float('ocr_confidence').nullable()
      table.uuid('ocr_job_id').nullable()
      table.string('content_hash', 64).nullable()
      table.integer('page_count').nullable()
      table.uuid('primary_file_id').nullable()
      table.index(['content_hash'])
      table.index(['ocr_job_id'])
    })

    this.schema.alterTable('documents', (table) => {
      table.boolean('legal_hold').notNullable().defaultTo(false)
      table.text('legal_hold_reason').nullable()
      table.timestamp('legal_hold_at', { useTz: true }).nullable()
      table.uuid('legal_hold_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.index(['legal_hold'])
    })

    this.schema.createTable('archival_transfers', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('transfer_number', 40).notNullable()
      table.string('title', 255).notNullable()
      table.string('status', 40).notNullable().defaultTo('draft')
      table.text('notes').nullable()
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('approved_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('approved_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'transfer_number'])
      table.index(['tenant_id', 'status'])
    })

    this.schema.createTable('archival_transfer_items', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table
        .uuid('transfer_id')
        .notNullable()
        .references('id')
        .inTable('archival_transfers')
        .onDelete('CASCADE')
      table
        .uuid('document_id')
        .notNullable()
        .references('id')
        .inTable('documents')
        .onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['transfer_id', 'document_id'])
      table.index(['tenant_id', 'document_id'])
    })

    this.schema.createTable('disposal_requests', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('request_number', 40).notNullable()
      table.string('title', 255).notNullable()
      table.string('status', 40).notNullable().defaultTo('pending')
      table.text('justification').notNullable()
      table.string('certificate_number', 80).nullable()
      table.text('certificate_notes').nullable()
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('approved_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('approved_at', { useTz: true }).nullable()
      table.timestamp('disposed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'request_number'])
      table.index(['tenant_id', 'status'])
    })

    this.schema.createTable('disposal_request_items', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table
        .uuid('disposal_request_id')
        .notNullable()
        .references('id')
        .inTable('disposal_requests')
        .onDelete('CASCADE')
      table
        .uuid('document_id')
        .notNullable()
        .references('id')
        .inTable('documents')
        .onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['disposal_request_id', 'document_id'])
      table.index(['tenant_id', 'document_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists('disposal_request_items')
    this.schema.dropTableIfExists('disposal_requests')
    this.schema.dropTableIfExists('archival_transfer_items')
    this.schema.dropTableIfExists('archival_transfers')

    this.schema.alterTable('documents', (table) => {
      table.dropColumn('legal_hold')
      table.dropColumn('legal_hold_reason')
      table.dropColumn('legal_hold_at')
      table.dropColumn('legal_hold_by_id')
    })

    this.schema.alterTable('digitization_batch_items', (table) => {
      table.dropColumn('ocr_confidence')
      table.dropColumn('ocr_job_id')
      table.dropColumn('content_hash')
      table.dropColumn('page_count')
      table.dropColumn('primary_file_id')
    })
  }
}
