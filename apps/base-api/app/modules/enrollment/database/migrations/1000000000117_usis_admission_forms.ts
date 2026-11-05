import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_admission_form_configs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('version', 32).notNullable()
      t.string('name', 255).notNullable()
      t.jsonb('form_fields').notNullable().defaultTo(this.raw(`'[]'::jsonb`))
      t.jsonb('survey_questions').notNullable().defaultTo(this.raw(`'[]'::jsonb`))
      t.text('terms_text').notNullable().defaultTo('')
      t.text('privacy_consent_text').notNullable().defaultTo('')
      t.boolean('is_active').notNullable().defaultTo(false)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'version'])
    })

    this.schema.raw(`
      ALTER TABLE ${this.ref('applicants')}
      ADD COLUMN IF NOT EXISTS form_config_id uuid NULL
        REFERENCES ${this.ref('usis_admission_form_configs')}(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS form_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS survey_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS privacy_consent_version varchar(32) NULL
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('applicants')}
      DROP COLUMN IF EXISTS form_config_id,
      DROP COLUMN IF EXISTS form_answers,
      DROP COLUMN IF EXISTS survey_answers,
      DROP COLUMN IF EXISTS terms_accepted_at,
      DROP COLUMN IF EXISTS privacy_consent_at,
      DROP COLUMN IF EXISTS privacy_consent_version
    `)
    this.s.dropTable('usis_admission_form_configs')
  }
}
