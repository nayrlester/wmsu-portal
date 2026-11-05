import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_student_import_batches', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('source_name', 255).notNullable().defaultTo('manual')
      t.string('status', 32).notNullable().defaultTo('completed')
      t.integer('total_rows').notNullable().defaultTo(0)
      t.integer('accepted_count').notNullable().defaultTo(0)
      t.integer('rejected_count').notNullable().defaultTo(0)
      t.uuid('created_by').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('completed_at', { useTz: true }).nullable()
      t.index(['organization_id', 'created_at'])
    })

    this.s.createTable('usis_student_import_rejections', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('batch_id')
        .notNullable()
        .references('id')
        .inTable(this.ref('usis_student_import_batches'))
        .onDelete('CASCADE')
      t.integer('row_number').notNullable()
      t.jsonb('payload').notNullable().defaultTo(this.raw(`'{}'::jsonb`))
      t.string('reason', 500).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.index(['batch_id', 'row_number'])
    })

    this.s.createTable('usis_student_import_accepted', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('batch_id')
        .notNullable()
        .references('id')
        .inTable(this.ref('usis_student_import_batches'))
        .onDelete('CASCADE')
      t.integer('row_number').notNullable()
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('student_number', 64).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.index(['batch_id'])
    })
  }

  async down() {
    this.s.dropTable('usis_student_import_accepted')
    this.s.dropTable('usis_student_import_rejections')
    this.s.dropTable('usis_student_import_batches')
  }
}
