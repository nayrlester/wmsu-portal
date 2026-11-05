import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('inventory_transactions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('type', 32).notNullable()
      t.uuid('item_id').notNullable().references('id').inTable(uimsTable('items')).onDelete('RESTRICT')
      t.uuid('from_warehouse_id').nullable().references('id').inTable(uimsTable('warehouses')).onDelete('RESTRICT')
      t.uuid('to_warehouse_id').nullable().references('id').inTable(uimsTable('warehouses')).onDelete('RESTRICT')
      t.decimal('quantity', 14, 4).notNullable()
      t.decimal('unit_cost', 14, 4).nullable()
      t.string('reference', 120).nullable()
      t.text('notes').nullable()
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'type'])
      t.index(['item_id'])
    })

    this.s.createTable('inventory_ledger', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('transaction_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('inventory_transactions'))
        .onDelete('CASCADE')
      t.uuid('item_id').notNullable().references('id').inTable(uimsTable('items')).onDelete('RESTRICT')
      t.uuid('warehouse_id').notNullable().references('id').inTable(uimsTable('warehouses')).onDelete('RESTRICT')
      t.uuid('bin_id').nullable().references('id').inTable(uimsTable('warehouse_bins')).onDelete('SET NULL')
      t.decimal('qty_in', 14, 4).notNullable().defaultTo(0)
      t.decimal('qty_out', 14, 4).notNullable().defaultTo(0)
      t.decimal('balance_after', 14, 4).notNullable()
      t.decimal('unit_cost', 14, 4).nullable()
      t.timestamp('occurred_at', { useTz: true }).notNullable()
      t.index(['item_id', 'warehouse_id'])
      t.index(['organization_id'])
    })

    this.s.createTable('stock_balances', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('item_id').notNullable().references('id').inTable(uimsTable('items')).onDelete('RESTRICT')
      t.uuid('warehouse_id').notNullable().references('id').inTable(uimsTable('warehouses')).onDelete('RESTRICT')
      t.uuid('bin_id').nullable().references('id').inTable(uimsTable('warehouse_bins')).onDelete('SET NULL')
      t.decimal('quantity', 14, 4).notNullable().defaultTo(0)
      t.decimal('reserved_quantity', 14, 4).notNullable().defaultTo(0)
      t.decimal('avg_unit_cost', 14, 4).notNullable().defaultTo(0)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['item_id', 'warehouse_id', 'bin_id'])
    })
  }

  async down() {
    this.s.dropTableIfExists('stock_balances')
    this.s.dropTableIfExists('inventory_ledger')
    this.s.dropTableIfExists('inventory_transactions')
  }
}
