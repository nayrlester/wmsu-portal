import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('clearance_office_requirements', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('office', 40).notNullable()
      t.string('requirement_code', 64).notNullable()
      t.string('label', 255).notNullable()
      t.string('auto_source', 64).nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.integer('sort_order').notNullable().defaultTo(100)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'office', 'requirement_code'])
      t.index(['organization_id', 'office', 'is_active'])
    })

    this.s.createTable('student_office_clearance_items', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('requirement_id')
        .notNullable()
        .references('id')
        .inTable(this.ref('clearance_office_requirements'))
        .onDelete('CASCADE')
      t.string('office', 40).notNullable()
      t.string('requirement_code', 64).notNullable()
      t.string('status', 32).notNullable().defaultTo('pending')
      t.boolean('auto_synced').notNullable().defaultTo(false)
      t.string('source_ref', 128).nullable()
      t.text('notes').nullable()
      t.uuid('updated_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('cleared_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'student_id', 'requirement_id'])
      t.index(['organization_id', 'student_id', 'status'])
      t.index(['organization_id', 'office', 'status'])
    })
  }

  async down() {
    this.s.dropTableIfExists('student_office_clearance_items')
    this.s.dropTableIfExists('clearance_office_requirements')
  }
}
