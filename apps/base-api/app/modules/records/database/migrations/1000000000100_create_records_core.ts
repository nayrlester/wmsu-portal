import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('academic_ledger_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('student_number', 64).notNullable()
      t.string('academic_year', 32).notNullable()
      t.integer('semester').notNullable()
      t.string('course_code', 32).notNullable()
      t.string('course_title', 255).notNullable()
      t.decimal('units', 4, 2).notNullable()
      t.decimal('grade', 5, 2).nullable()
      t.string('remarks', 32).nullable()
      t.timestamp('synced_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['student_number', 'academic_year', 'semester'])
    })

    this.s.createTable('tor_requests', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('request_number', 64).notNullable().unique()
      t.string('student_number', 64).notNullable()
      t.string('purpose', 255).nullable()
      t.string('status', 32).defaultTo('pending')
      t.timestamp('requested_at', { useTz: true }).notNullable()
      t.timestamp('released_at', { useTz: true }).nullable()
      t.uuid('processed_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('certification_requests', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('request_number', 64).notNullable().unique()
      t.string('student_number', 64).notNullable()
      t.string('certification_type', 64).notNullable()
      t.string('purpose', 255).nullable()
      t.string('status', 32).defaultTo('pending')
      t.timestamp('requested_at', { useTz: true }).notNullable()
      t.timestamp('released_at', { useTz: true }).nullable()
      t.uuid('processed_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('alumni_profiles', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('student_number', 64).notNullable().unique()
      t.string('first_name', 128).notNullable()
      t.string('middle_name', 128).nullable()
      t.string('last_name', 128).notNullable()
      t.string('email', 255).nullable()
      t.string('mobile', 32).nullable()
      t.string('program_code', 32).nullable()
      t.string('degree_title', 255).nullable()
      t.integer('graduation_year').nullable()
      t.text('employment_info').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.s.dropTableIfExists('alumni_profiles')
    this.s.dropTableIfExists('certification_requests')
    this.s.dropTableIfExists('tor_requests')
    this.s.dropTableIfExists('academic_ledger_lines')
  }
}
