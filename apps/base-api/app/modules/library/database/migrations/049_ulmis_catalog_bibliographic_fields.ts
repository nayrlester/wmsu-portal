import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('books', (table) => {
      table
        .string('material_type', 40)
        .notNullable()
        .defaultTo('book')
      table.string('classification_scheme', 10).nullable()
      table.string('classification_number', 100).nullable()
      table.string('issn', 20).nullable()
      table.integer('publication_year').nullable()
      table.text('subject_names').nullable()
      table.index(['tenant_id', 'material_type'])
      table.index(['tenant_id', 'classification_scheme', 'classification_number'])
      table.index(['tenant_id', 'issn'])
    })

    this.schema.createTable('subjects', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('name', 300).notNullable()
      table.string('normalized_name', 300).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['tenant_id', 'normalized_name'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('book_subjects', (table) => {
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')
      table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE')
      table.integer('sort_order').notNullable().defaultTo(0)
      table.primary(['book_id', 'subject_id'])
    })
  }

  async down() {
    this.schema.dropTable('book_subjects')
    this.schema.dropTable('subjects')
    this.schema.alterTable('books', (table) => {
      table.dropIndex(['tenant_id', 'material_type'])
      table.dropIndex(['tenant_id', 'classification_scheme', 'classification_number'])
      table.dropIndex(['tenant_id', 'issn'])
      table.dropColumn('material_type')
      table.dropColumn('classification_scheme')
      table.dropColumn('classification_number')
      table.dropColumn('issn')
      table.dropColumn('publication_year')
      table.dropColumn('subject_names')
    })
  }
}
