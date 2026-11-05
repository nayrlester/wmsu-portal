import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('retention_schedules', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('code', 80).notNullable()
      table.string('nap_category', 80).notNullable()
      table.integer('retention_years').notNullable().defaultTo(0)
      table.integer('retention_months').notNullable().defaultTo(0)
      table.string('disposition_action', 40).notNullable().defaultTo('archive')
      table.text('description').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.boolean('is_system').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'code'])
      table.index(['tenant_id'])
      table.index(['nap_category'])
    })

    this.schema.alterTable('documents', (table) => {
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
      table.date('document_date').nullable()
      table.timestamp('received_at', { useTz: true }).nullable()
      table.text('subject_keywords').nullable()
      table.string('confidentiality', 40).notNullable().defaultTo('internal')
      table.string('nap_category', 80).nullable()
      table
        .uuid('retention_schedule_id')
        .nullable()
        .references('id')
        .inTable('retention_schedules')
        .onDelete('SET NULL')
      table.string('lifecycle_status', 40).notNullable().defaultTo('active')
      table.timestamp('retention_due_at', { useTz: true }).nullable()
      table.string('disposition_action', 40).nullable()

      table.index(['confidentiality'])
      table.index(['nap_category'])
      table.index(['lifecycle_status'])
      table.index(['retention_due_at'])
    })
  }

  async down() {
    this.schema.alterTable('documents', (table) => {
      table.dropColumn('originating_office_id')
      table.dropColumn('receiving_office_id')
      table.dropColumn('document_date')
      table.dropColumn('received_at')
      table.dropColumn('subject_keywords')
      table.dropColumn('confidentiality')
      table.dropColumn('nap_category')
      table.dropColumn('retention_schedule_id')
      table.dropColumn('lifecycle_status')
      table.dropColumn('retention_due_at')
      table.dropColumn('disposition_action')
    })
    this.schema.dropTable('retention_schedules')
  }
}
