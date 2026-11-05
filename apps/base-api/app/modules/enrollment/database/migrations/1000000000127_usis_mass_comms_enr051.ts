import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.ref('usis_communication_settings')}
      ADD COLUMN IF NOT EXISTS sms_delivery_mode varchar(32) NOT NULL DEFAULT 'queue_only'
    `)

    this.s.createTable('usis_student_contacts', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('relation', 32).notNullable()
      t.string('full_name', 255).notNullable()
      t.string('mobile', 32).nullable()
      t.string('email', 255).nullable()
      t.boolean('sms_opt_in').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'student_id'])
      t.index(['organization_id', 'relation'])
    })

    this.s.createTable('usis_mass_sms_campaigns', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('title', 255).notNullable()
      t.text('message').notNullable()
      t.jsonb('filters').notNullable().defaultTo('{}')
      t.jsonb('recipient_kinds').notNullable().defaultTo(this.raw(`'["student"]'::jsonb`))
      t.string('status', 32).notNullable().defaultTo('queued')
      t.integer('recipient_count').notNullable().defaultTo(0)
      t.string('delivery_mode', 32).notNullable().defaultTo('queue_only')
      t.text('last_error').nullable()
      t.uuid('announcement_id').nullable().references('id').inTable(this.ref('usis_announcements')).onDelete('SET NULL')
      t.uuid('requested_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('queued_at', { useTz: true }).notNullable()
      t.timestamp('completed_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status', 'created_at'])
    })

    this.s.createTable('usis_surveys', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('kind', 16).notNullable().defaultTo('survey')
      t.string('title', 500).notNullable()
      t.text('description').nullable()
      t.string('status', 32).notNullable().defaultTo('draft')
      t.jsonb('audience').notNullable().defaultTo('{}')
      t.jsonb('questions').notNullable().defaultTo('[]')
      t.timestamp('opens_at', { useTz: true }).nullable()
      t.timestamp('closes_at', { useTz: true }).nullable()
      t.uuid('created_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status'])
      t.index(['organization_id', 'kind'])
    })

    this.s.createTable('usis_survey_responses', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('survey_id').notNullable().references('id').inTable(this.ref('usis_surveys')).onDelete('CASCADE')
      t.uuid('user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.uuid('student_id').nullable().references('id').inTable(this.ref('students')).onDelete('SET NULL')
      t.jsonb('answers').notNullable().defaultTo('{}')
      t.timestamp('submitted_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.unique(['survey_id', 'user_id'])
      t.index(['organization_id', 'survey_id'])
    })
  }

  async down() {
    this.s.dropTable('usis_survey_responses')
    this.s.dropTable('usis_surveys')
    this.s.dropTable('usis_mass_sms_campaigns')
    this.s.dropTable('usis_student_contacts')
    this.schema.raw(`
      ALTER TABLE ${this.ref('usis_communication_settings')}
      DROP COLUMN IF EXISTS sms_delivery_mode
    `)
  }
}
