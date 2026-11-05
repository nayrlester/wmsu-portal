import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('document_intelligence_jobs', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('file_id').notNullable().references('id').inTable('document_files').onDelete('CASCADE')
      table.string('status', 30).notNullable().defaultTo('pending')
      table.jsonb('tasks').notNullable()
      table.string('ocr_provider', 50).nullable()
      table.string('ai_provider', 50).nullable()
      table.jsonb('result').nullable()
      table.text('error_message').nullable()
      table.timestamp('started_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
      table.index(['document_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable('document_intelligence_jobs')
  }
}
