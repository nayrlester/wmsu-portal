import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected schemaName = 'enrollment'

  async up() {
    this.schema.withSchema(this.schemaName).alterTable('enrollments', (table) => {
      table.jsonb('advised_curriculum_ids').nullable()
    })
    this.defer(async (db) => {
      await db.raw(`
        update enrollment.enrollments
        set advised_curriculum_ids = jsonb_build_array(advised_curriculum_id)
        where advised_curriculum_id is not null
          and advised_curriculum_ids is null
      `)
    })
  }

  async down() {
    this.schema.withSchema(this.schemaName).alterTable('enrollments', (table) => {
      table.dropColumn('advised_curriculum_ids')
    })
  }
}
