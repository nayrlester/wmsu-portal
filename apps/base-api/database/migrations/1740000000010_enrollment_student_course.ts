import { BaseSchema } from '@adonisjs/lucid/schema'

function enrollmentTable(table: string) {
  return `enrollment.${table}`
}

export default class extends BaseSchema {
  protected schemaName = 'enrollment'

  async up() {
    this.schema.withSchema(this.schemaName).alterTable('enrollments', (table) => {
      table
        .uuid('advised_curriculum_id')
        .nullable()
        .references('id')
        .inTable(enrollmentTable('usis_curricula'))
        .onDelete('SET NULL')
      table
        .uuid('curriculum_id')
        .nullable()
        .references('id')
        .inTable(enrollmentTable('usis_curricula'))
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.withSchema(this.schemaName).alterTable('enrollments', (table) => {
      table.dropColumn('advised_curriculum_id')
      table.dropColumn('curriculum_id')
    })
  }
}
