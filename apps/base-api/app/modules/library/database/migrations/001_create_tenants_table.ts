import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tenants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('slug', 63).notNullable().unique()
      table.string('name', 200).notNullable()
      table
        .enum('type', ['school', 'university', 'public_library', 'corporate', 'government'])
        .notNullable()
      table
        .enum('status', ['provisioning', 'active', 'suspended', 'cancelled'])
        .notNullable()
        .defaultTo('active')
      table.string('timezone', 50).notNullable().defaultTo('UTC')
      table.string('locale', 10).notNullable().defaultTo('en-US')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
