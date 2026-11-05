import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('certification_type_configs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('organizations'))
        .onDelete('CASCADE')
      t.string('code', 64).notNullable()
      t.string('official_name', 255).notNullable()
      t.text('description').nullable()
      t.boolean('active').notNullable().defaultTo(true)
      t.boolean('international_capable').notNullable().defaultTo(false)
      t.string('academic_focus', 32).notNullable().defaultTo('full')
      t.jsonb('required_info_json').notNullable().defaultTo(this.raw(`'[]'::jsonb`))
      t.text('processing_notes').nullable()
      t.string('template_ref', 255).nullable()
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
      t.index(['organization_id', 'active'])
    })
  }

  async down() {
    this.s.dropTableIfExists('certification_type_configs')
  }
}
