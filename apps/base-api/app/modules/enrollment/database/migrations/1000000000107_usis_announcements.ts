import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_communication_settings', (t) => {
      t.uuid('organization_id').primary().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.boolean('social_features_enabled').notNullable().defaultTo(false)
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('usis_announcements', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('title', 500).notNullable()
      t.text('body').notNullable()
      t.string('status', 32).notNullable().defaultTo('draft')
      t.jsonb('audience').notNullable().defaultTo('{}')
      t.boolean('is_pinned').notNullable().defaultTo(false)
      t.timestamp('publish_at', { useTz: true }).nullable()
      t.timestamp('expires_at', { useTz: true }).nullable()
      t.boolean('deliver_portal').notNullable().defaultTo(true)
      t.boolean('deliver_email').notNullable().defaultTo(false)
      t.boolean('deliver_sms').notNullable().defaultTo(false)
      t.uuid('created_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status'])
      t.index(['organization_id', 'publish_at'])
    })

    this.s.createTable('usis_announcement_deliveries', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('announcement_id').notNullable().references('id').inTable(this.ref('usis_announcements')).onDelete('CASCADE')
      t.string('channel', 16).notNullable()
      t.string('status', 32).notNullable().defaultTo('queued')
      t.integer('recipient_count').notNullable().defaultTo(0)
      t.jsonb('filters').nullable()
      t.text('last_error').nullable()
      t.timestamp('queued_at', { useTz: true }).notNullable()
      t.timestamp('completed_at', { useTz: true }).nullable()
      t.uuid('requested_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
    })
  }

  async down() {
    this.s.dropTable('usis_announcement_deliveries')
    this.s.dropTable('usis_announcements')
    this.s.dropTable('usis_communication_settings')
  }
}
