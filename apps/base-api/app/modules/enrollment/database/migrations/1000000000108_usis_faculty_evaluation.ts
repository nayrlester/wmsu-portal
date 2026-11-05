import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_faculty_eval_codes', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 32).notNullable()
      t.string('name', 255).notNullable()
      t.text('description').nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('usis_faculty_eval_questions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 64).nullable()
      t.text('prompt').notNullable()
      t.string('question_type', 16).notNullable().defaultTo('likert')
      t.integer('sort_order').notNullable().defaultTo(0)
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'is_active'])
    })

    this.s.createTable('usis_faculty_eval_schedules', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('eval_code_id').notNullable().references('id').inTable(this.ref('usis_faculty_eval_codes')).onDelete('RESTRICT')
      t.string('title', 500).notNullable()
      t.string('status', 16).notNullable().defaultTo('draft')
      t.jsonb('question_ids').notNullable().defaultTo('[]')
      t.timestamp('opens_at', { useTz: true }).nullable()
      t.timestamp('closes_at', { useTz: true }).nullable()
      t.uuid('created_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status'])
    })

    this.s.createTable('usis_faculty_eval_targets', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('schedule_id').notNullable().references('id').inTable(this.ref('usis_faculty_eval_schedules')).onDelete('CASCADE')
      t.uuid('faculty_user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.uuid('section_id').nullable().references('id').inTable(this.ref('sections')).onDelete('SET NULL')
      t.string('subject_code', 64).nullable()
      t.string('subject_title', 255).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.unique(['schedule_id', 'faculty_user_id', 'section_id'])
    })

    this.s.createTable('usis_faculty_eval_responses', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('schedule_id').notNullable().references('id').inTable(this.ref('usis_faculty_eval_schedules')).onDelete('CASCADE')
      t.uuid('target_id').notNullable().references('id').inTable(this.ref('usis_faculty_eval_targets')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.jsonb('answers').notNullable().defaultTo('{}')
      t.timestamp('submitted_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.unique(['target_id', 'student_id'])
    })
  }

  async down() {
    this.s.dropTable('usis_faculty_eval_responses')
    this.s.dropTable('usis_faculty_eval_targets')
    this.s.dropTable('usis_faculty_eval_schedules')
    this.s.dropTable('usis_faculty_eval_questions')
    this.s.dropTable('usis_faculty_eval_codes')
  }
}
