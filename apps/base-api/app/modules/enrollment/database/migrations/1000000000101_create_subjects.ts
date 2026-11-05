import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('subjects', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.schemaName + '.organizations').onDelete('CASCADE')
      t.string('subject_code', 32).notNullable()
      t.string('title', 255).notNullable()
      t.integer('units').notNullable().defaultTo(3)
      t.uuid('program_id').nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'subject_code'])
    })
  }

  async down() {
    this.s.dropTableIfExists('subjects')
  }
}
