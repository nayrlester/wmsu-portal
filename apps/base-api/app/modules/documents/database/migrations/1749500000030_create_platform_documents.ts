import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Enterprise document hub catalog — M2M uploads from HRIS / Library / DocTrack.
 */
export default class extends BaseSchema {
  protected tableName = 'platform_documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('org_id', 255).notNullable().index()
      table.string('platform_prefix', 32).notNullable().index()
      table.string('platform_label', 64).notNullable()
      table.string('storage_key', 1024).notNullable()
      table.string('original_name', 512).notNullable()
      table.string('content_type', 255).notNullable().defaultTo('application/octet-stream')
      table.bigInteger('size_bytes').notNullable().defaultTo(0)
      table.string('uploaded_by', 255).notNullable().defaultTo('system')
      table.string('entity_type', 128).nullable()
      table.string('entity_id', 255).nullable()
      table.string('status', 32).notNullable().defaultTo('active').index()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['org_id', 'platform_prefix', 'status'])
      table.index(['entity_type', 'entity_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
