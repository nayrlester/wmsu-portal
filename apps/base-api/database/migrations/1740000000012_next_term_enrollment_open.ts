import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected schemaName = 'enrollment'

  async up() {
    this.schema.withSchema(this.schemaName).alterTable('usis_academic_policies', (table) => {
      table.boolean('next_term_enrollment_open').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.withSchema(this.schemaName).alterTable('usis_academic_policies', (table) => {
      table.dropColumn('next_term_enrollment_open')
    })
  }
}
