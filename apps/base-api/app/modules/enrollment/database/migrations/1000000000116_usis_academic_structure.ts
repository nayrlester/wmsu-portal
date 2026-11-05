import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_colleges', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 32).notNullable()
      t.string('name', 255).notNullable()
      t.string('dean_name', 255).nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('usis_academic_departments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('college_id').notNullable().references('id').inTable(this.ref('usis_colleges')).onDelete('CASCADE')
      t.string('code', 32).notNullable()
      t.string('name', 255).notNullable()
      t.string('head_name', 255).nullable()
      t.string('head_platform_user_id', 64).nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
      t.index(['college_id'])
    })

    this.s.createTable('usis_positions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 32).notNullable()
      t.string('name', 255).notNullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('usis_subject_areas', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('college_id').nullable().references('id').inTable(this.ref('usis_colleges')).onDelete('SET NULL')
      t.string('code', 32).notNullable()
      t.string('name', 255).notNullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('usis_employee_assignments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('platform_user_id', 64).notNullable()
      t.string('display_name', 255).nullable()
      t.uuid('college_id').nullable().references('id').inTable(this.ref('usis_colleges')).onDelete('SET NULL')
      t.uuid('academic_department_id')
        .nullable()
        .references('id')
        .inTable(this.ref('usis_academic_departments'))
        .onDelete('SET NULL')
      t.uuid('position_id').nullable().references('id').inTable(this.ref('usis_positions')).onDelete('SET NULL')
      t.boolean('is_department_head').notNullable().defaultTo(false)
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'platform_user_id'])
    })

    this.schema.raw(`
      ALTER TABLE ${this.ref('programs')}
      ADD COLUMN IF NOT EXISTS college_id uuid NULL
        REFERENCES ${this.ref('usis_colleges')}(id) ON DELETE SET NULL
    `)
  }

  async down() {
    this.schema.raw(`ALTER TABLE ${this.ref('programs')} DROP COLUMN IF EXISTS college_id`)
    this.s.dropTable('usis_employee_assignments')
    this.s.dropTable('usis_subject_areas')
    this.s.dropTable('usis_positions')
    this.s.dropTable('usis_academic_departments')
    this.s.dropTable('usis_colleges')
  }
}
