import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('scholarships', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(uimsTable('students')).onDelete('CASCADE')
      t.string('scholarship_code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.decimal('amount', 15, 2).notNullable().defaultTo(0)
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('awarded_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('student_deficiencies', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(uimsTable('students')).onDelete('CASCADE')
      t.string('requirement_code', 64).notNullable()
      t.string('description', 512).notNullable()
      t.string('status', 32).notNullable().defaultTo('open')
      t.timestamp('cleared_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('phase2_records', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('module_code', 64).notNullable()
      t.string('reference_key', 128).notNullable()
      t.string('title', 255).notNullable()
      t.jsonb('payload').notNullable().defaultTo('{}')
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'module_code', 'reference_key'])
    })
  }

  async down() {
    this.s.dropTableIfExists('phase2_records')
    this.s.dropTableIfExists('student_deficiencies')
    this.s.dropTableIfExists('scholarships')
  }
}
