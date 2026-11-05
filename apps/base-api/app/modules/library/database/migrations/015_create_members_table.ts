import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')

      table.string('full_name', 200).notNullable()
      table.string('email', 254).nullable()
      table.string('contact', 50).nullable()
      table.string('department', 200).nullable()

      table
        .enum('member_type', ['student', 'faculty', 'employee', 'researcher', 'guest'])
        .notNullable()
        .defaultTo('student')

      table
        .enum('membership_status', [
          'pending',
          'approved',
          'rejected',
          'suspended',
          'expired',
        ])
        .notNullable()
        .defaultTo('pending')

      table.string('library_card_number', 50).notNullable()

      table.timestamp('approved_at', { useTz: true }).nullable()
      table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('rejected_at', { useTz: true }).nullable()
      table.uuid('rejected_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.text('rejection_reason').nullable()

      table.text('search_text').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'library_card_number'])
      table.unique(['tenant_id', 'email'])
      table.index(['tenant_id', 'membership_status'])
      table.index(['tenant_id', 'member_type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
