import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('departments', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('code', 50).nullable()
      table.text('description').nullable()
      table.uuid('parent_id').nullable().references('id').inTable('departments').onDelete('SET NULL')
      table.uuid('head_user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
      table.unique(['tenant_id', 'code'])
    })

    this.schema.createTable('document_types', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('code', 50).notNullable()
      table.text('description').nullable()
      table.uuid('default_workflow_id').nullable()
      table.jsonb('metadata_schema').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'code'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('tracking_sequences', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.integer('year').notNullable()
      table.integer('last_number').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'year'])
    })

    this.schema.createTable('documents', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('tracking_number', 50).notNullable()
      table.string('title', 500).notNullable()
      table.text('description').nullable()
      table.string('status', 50).notNullable().defaultTo('draft')
      table.string('priority', 20).notNullable().defaultTo('medium')
      table.uuid('document_type_id').nullable().references('id').inTable('document_types').onDelete('SET NULL')
      table.uuid('department_id').nullable().references('id').inTable('departments').onDelete('SET NULL')
      table.uuid('created_by_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.uuid('assigned_to_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('current_workflow_id').nullable()
      table.string('qr_code_url', 500).nullable()
      table.jsonb('metadata').nullable()
      table.jsonb('ai_classification').nullable()
      table.text('ai_summary').nullable()
      table.timestamp('submitted_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'tracking_number'])
      table.index(['tenant_id'])
      table.index(['status'])
      table.index(['department_id'])
      table.index(['created_by_id'])
    })

    this.schema.raw(`
      CREATE INDEX documents_search_idx ON documents
      USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || tracking_number))
    `)

    this.schema.createTable('document_versions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.integer('version_number').notNullable()
      table.text('change_notes').nullable()
      table.uuid('created_by_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['document_id', 'version_number'])
      table.index(['document_id'])
    })

    this.schema.createTable('document_files', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('version_id').nullable().references('id').inTable('document_versions').onDelete('SET NULL')
      table.string('file_name', 500).notNullable()
      table.string('original_name', 500).notNullable()
      table.string('mime_type', 100).notNullable()
      table.bigInteger('file_size').notNullable()
      table.string('s3_key', 1000).notNullable()
      table.string('s3_bucket', 255).notNullable()
      table.string('checksum', 128).nullable()
      table.boolean('virus_scanned').notNullable().defaultTo(false)
      table.boolean('virus_clean').nullable()
      table.jsonb('extracted_metadata').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['document_id'])
      table.index(['tenant_id'])
    })
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS documents_search_idx')
    this.schema.dropTable('document_files')
    this.schema.dropTable('document_versions')
    this.schema.dropTable('documents')
    this.schema.dropTable('tracking_sequences')
    this.schema.dropTable('document_types')
    this.schema.dropTable('departments')
  }
}
