import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('esign_envelopes', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('version_id').nullable().references('id').inTable('document_versions').onDelete('SET NULL')
      table.uuid('file_id').nullable().references('id').inTable('document_files').onDelete('SET NULL')
      table.string('pandadoc_document_id', 100).notNullable()
      table.string('status', 40).notNullable().defaultTo('draft')
      table.jsonb('recipients').notNullable().defaultTo('[]')
      table.uuid('signed_file_id').nullable().references('id').inTable('document_files').onDelete('SET NULL')
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.text('error_message').nullable()
      table.timestamp('sent_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
      table.index(['document_id'])
      table.unique(['tenant_id', 'pandadoc_document_id'])
    })
  }

  async down() {
    this.schema.dropTable('esign_envelopes')
  }
}
