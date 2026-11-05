import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('item_categories', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('name', 255).notNullable()
      t.string('code', 64).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('items', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('category_id').nullable().references('id').inTable(uimsTable('item_categories')).onDelete('SET NULL')
      t.string('sku', 64).notNullable()
      t.string('barcode', 64).nullable()
      t.string('name', 255).notNullable()
      t.string('uom', 32).notNullable().defaultTo('pc')
      t.string('fund_source', 120).nullable()
      t.string('brand', 120).nullable()
      t.string('model', 120).nullable()
      t.string('manufacturer', 120).nullable()
      t.integer('min_stock').notNullable().defaultTo(0)
      t.integer('max_stock').nullable()
      t.integer('reorder_point').nullable()
      t.string('valuation_method', 32).notNullable().defaultTo('weighted_average')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.timestamp('deleted_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'sku'])
    })
  }

  async down() {
    this.s.dropTableIfExists('items')
    this.s.dropTableIfExists('item_categories')
  }
}
