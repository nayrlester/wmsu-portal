import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.s.createTable(this.tableName, (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('actor_user_id').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.string('action', 64).notNullable()
      t.string('entity_type', 64).notNullable()
      t.uuid('entity_id').nullable()
      t.jsonb('metadata').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.index(['organization_id', 'action'])
      t.index(['entity_type', 'entity_id'])
    })
  }

  async down() {
    this.s.dropTableIfExists(this.tableName)
  }
}
