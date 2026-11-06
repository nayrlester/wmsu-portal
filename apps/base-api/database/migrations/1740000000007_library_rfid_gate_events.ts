import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected schemaName = 'library'

  async up() {
    const schema = this.schema.withSchema(this.schemaName)
    schema.createTable('rfid_gate_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('library.tenants')
        .onDelete('CASCADE')
      table.string('gate_code', 50).notNullable()
      table.string('tag_uid', 100).notNullable()
      table.uuid('copy_id').nullable()
      table.string('result', 20).notNullable()
      table.string('reason', 200).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['tenant_id', 'created_at'])
      table.index(['tenant_id', 'result'])
    })
  }

  async down() {
    this.schema.withSchema(this.schemaName).dropTable('rfid_gate_events')
  }
}
