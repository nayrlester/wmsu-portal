import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('code', 100).notNullable().unique()
      table.string('resource', 50).notNullable()
      table.string('action', 50).notNullable()
      table.text('description').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
