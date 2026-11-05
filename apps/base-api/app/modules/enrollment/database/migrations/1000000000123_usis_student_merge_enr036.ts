import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('students')}
      ADD COLUMN IF NOT EXISTS merged_into_student_id uuid NULL,
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL
    `)

    this.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'students_merged_into_student_id_fkey'
        ) THEN
          ALTER TABLE ${this.ref('students')}
            ADD CONSTRAINT students_merged_into_student_id_fkey
            FOREIGN KEY (merged_into_student_id)
            REFERENCES ${this.ref('students')}(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    this.schema.raw(`
      ALTER TABLE ${this.ref('applicants')}
      ADD COLUMN IF NOT EXISTS classification character varying(40) NULL,
      ADD COLUMN IF NOT EXISTS mdm_campus_id uuid NULL
    `)

    this.s.createTable('usis_student_merge_jobs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('survivor_student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('RESTRICT')
      t.uuid('duplicate_student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('RESTRICT')
      t.string('status', 32).notNullable().defaultTo('completed')
      t.jsonb('report_json').notNullable().defaultTo(this.raw(`'{}'::jsonb`))
      t.string('note', 500).nullable()
      t.uuid('created_by').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('completed_at', { useTz: true }).nullable()
      t.index(['organization_id', 'created_at'])
      t.index(['survivor_student_id'])
      t.index(['duplicate_student_id'])
    })

    this.s.createTable('usis_student_classification_history', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').nullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('applicant_id').nullable().references('id').inTable(this.ref('applicants')).onDelete('CASCADE')
      t.string('from_classification', 40).nullable()
      t.string('to_classification', 40).notNullable()
      t.uuid('changed_by').nullable()
      t.string('note', 500).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.index(['student_id', 'created_at'])
      t.index(['applicant_id', 'created_at'])
    })
  }

  async down() {
    this.s.dropTable('usis_student_classification_history')
    this.s.dropTable('usis_student_merge_jobs')
    this.schema.raw(`
      ALTER TABLE ${this.ref('applicants')}
      DROP COLUMN IF EXISTS classification,
      DROP COLUMN IF EXISTS mdm_campus_id
    `)
    this.schema.raw(`
      ALTER TABLE ${this.ref('students')}
      DROP CONSTRAINT IF EXISTS students_merged_into_student_id_fkey,
      DROP COLUMN IF EXISTS merged_into_student_id,
      DROP COLUMN IF EXISTS deleted_at
    `)
  }
}
