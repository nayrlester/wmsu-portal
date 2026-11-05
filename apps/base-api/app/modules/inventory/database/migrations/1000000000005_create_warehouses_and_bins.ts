import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('warehouses', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('campus_id').notNullable().references('id').inTable(uimsTable('campuses')).onDelete('CASCADE')
      t.string('name', 255).notNullable()
      t.string('code', 32).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('warehouse_bins', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('warehouse_id').notNullable().references('id').inTable(uimsTable('warehouses')).onDelete('CASCADE')
      t.string('zone', 64).nullable()
      t.string('rack', 64).nullable()
      t.string('shelf', 64).nullable()
      t.string('bin_code', 64).notNullable()
      t.integer('capacity').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['warehouse_id', 'bin_code'])
    })
  }

  async down() {
    this.s.dropTableIfExists('warehouse_bins')
    this.s.dropTableIfExists('warehouses')
  }
}
