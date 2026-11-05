import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('subjects')}
      ADD COLUMN IF NOT EXISTS lecture_hours integer NULL,
      ADD COLUMN IF NOT EXISTS laboratory_hours integer NULL
    `)

    this.s.createTable('usis_curricula', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('program_id').notNullable().references('id').inTable(this.ref('programs')).onDelete('CASCADE')
      t.string('code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'program_id', 'code'])
      t.index(['organization_id', 'program_id'])
    })

    this.s.createTable('usis_curriculum_versions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('curriculum_id').notNullable().references('id').inTable(this.ref('usis_curricula')).onDelete('CASCADE')
      t.string('version_label', 64).notNullable()
      t.string('status', 32).notNullable().defaultTo('draft')
      t.date('effective_from').nullable()
      t.text('notes').nullable()
      t.uuid('duplicated_from_version_id').nullable()
      t.uuid('created_by').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['curriculum_id', 'version_label'])
      t.index(['organization_id', 'curriculum_id', 'status'])
    })

    this.s.createTable('usis_curriculum_version_subjects', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('curriculum_version_id')
        .notNullable()
        .references('id')
        .inTable(this.ref('usis_curriculum_versions'))
        .onDelete('CASCADE')
      t.uuid('subject_id').notNullable().references('id').inTable(this.ref('subjects')).onDelete('CASCADE')
      t.integer('year_level').notNullable().defaultTo(1)
      t.integer('semester').notNullable().defaultTo(1)
      t.boolean('is_required').notNullable().defaultTo(true)
      t.integer('sort_order').notNullable().defaultTo(0)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['curriculum_version_id', 'subject_id'])
      t.index(['subject_id'])
    })
  }

  async down() {
    this.s.dropTable('usis_curriculum_version_subjects')
    this.s.dropTable('usis_curriculum_versions')
    this.s.dropTable('usis_curricula')
    this.schema.raw(`
      ALTER TABLE ${this.ref('subjects')}
      DROP COLUMN IF EXISTS lecture_hours,
      DROP COLUMN IF EXISTS laboratory_hours
    `)
  }
}
