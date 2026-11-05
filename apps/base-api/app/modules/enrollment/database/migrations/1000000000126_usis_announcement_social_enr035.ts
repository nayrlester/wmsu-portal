import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_announcement_reactions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('announcement_id').notNullable().references('id').inTable(this.ref('usis_announcements')).onDelete('CASCADE')
      t.uuid('user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.string('kind', 16).notNullable()
      t.text('body').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['announcement_id', 'kind'])
      t.index(['organization_id', 'user_id'])
    })
    this.schema.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS usis_announcement_likes_unique
      ON ${this.ref('usis_announcement_reactions')} (announcement_id, user_id)
      WHERE kind = 'like'
    `)
  }

  async down() {
    this.schema.raw(`DROP INDEX IF EXISTS ${this.ref('usis_announcement_likes_unique')}`)
    this.s.dropTable('usis_announcement_reactions')
  }
}
