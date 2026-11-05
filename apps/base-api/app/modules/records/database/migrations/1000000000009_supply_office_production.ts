import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

/**
 * Supply Office production extensions:
 * suppliers, item expiry/safety, stock return/disposal/reserve,
 * requisitions, COA forms, physical count, GAM depreciation, property ledger.
 */
export default class extends UimsSchema {
  async up() {
    this.s.createTable('suppliers', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.string('contact_name', 255).nullable()
      t.string('email', 255).nullable()
      t.string('phone', 64).nullable()
      t.string('address', 500).nullable()
      t.string('tin', 64).nullable()
      t.boolean('active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.schema.raw(`
      ALTER TABLE ${uimsTable('items')}
        ADD COLUMN IF NOT EXISTS supplier_id uuid NULL REFERENCES ${uimsTable('suppliers')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS safety_stock numeric(14,4) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS expiry_tracked boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS description text NULL
    `)

    this.schema.raw(`
      ALTER TABLE ${uimsTable('stock_balances')}
        ADD COLUMN IF NOT EXISTS lot_number varchar(64) NULL,
        ADD COLUMN IF NOT EXISTS expires_at date NULL
    `)

    this.schema.raw(`
      ALTER TABLE ${uimsTable('warehouses')}
        ADD COLUMN IF NOT EXISTS location_type varchar(32) NOT NULL DEFAULT 'warehouse'
    `)

    this.s.createTable('supply_requisitions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('requisition_no', 64).notNullable()
      t.uuid('requesting_office_id').nullable().references('id').inTable(uimsTable('offices')).onDelete('SET NULL')
      t.uuid('requested_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.string('status', 32).notNullable().defaultTo('draft')
      t.text('purpose').nullable()
      t.uuid('approved_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('approved_at', { useTz: true }).nullable()
      t.timestamp('fulfilled_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'requisition_no'])
    })

    this.s.createTable('supply_requisition_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('requisition_id').notNullable().references('id').inTable(uimsTable('supply_requisitions')).onDelete('CASCADE')
      t.uuid('item_id').notNullable().references('id').inTable(uimsTable('items')).onDelete('RESTRICT')
      t.decimal('quantity_requested', 14, 4).notNullable()
      t.decimal('quantity_approved', 14, 4).nullable()
      t.decimal('quantity_issued', 14, 4).notNullable().defaultTo(0)
      t.text('notes').nullable()
    })

    this.s.createTable('stock_reservations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('item_id').notNullable().references('id').inTable(uimsTable('items')).onDelete('RESTRICT')
      t.uuid('warehouse_id').notNullable().references('id').inTable(uimsTable('warehouses')).onDelete('RESTRICT')
      t.decimal('quantity', 14, 4).notNullable()
      t.string('status', 32).notNullable().defaultTo('active')
      t.string('reference', 120).nullable()
      t.uuid('requisition_id').nullable().references('id').inTable(uimsTable('supply_requisitions')).onDelete('SET NULL')
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('expires_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status'])
    })

    this.s.createTable('coa_documents', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('form_type', 32).notNullable()
      t.string('document_no', 64).notNullable()
      t.string('status', 32).notNullable().defaultTo('draft')
      t.uuid('asset_id').nullable().references('id').inTable(uimsTable('assets')).onDelete('SET NULL')
      t.uuid('assignment_id').nullable().references('id').inTable(uimsTable('asset_assignments')).onDelete('SET NULL')
      t.uuid('custodian_user_id').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.string('custodian_name', 255).nullable()
      t.string('custodian_external_id', 64).nullable()
      t.uuid('office_id').nullable().references('id').inTable(uimsTable('offices')).onDelete('SET NULL')
      t.date('document_date').notNullable()
      t.jsonb('payload').notNullable().defaultTo('{}')
      t.uuid('prepared_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('approved_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('approved_at', { useTz: true }).nullable()
      t.string('signed_custodian_at', 64).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'form_type', 'document_no'])
      t.index(['organization_id', 'form_type', 'status'])
    })

    this.s.createTable('coa_document_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('document_id').notNullable().references('id').inTable(uimsTable('coa_documents')).onDelete('CASCADE')
      t.uuid('asset_id').nullable().references('id').inTable(uimsTable('assets')).onDelete('SET NULL')
      t.uuid('item_id').nullable().references('id').inTable(uimsTable('items')).onDelete('SET NULL')
      t.string('description', 500).notNullable()
      t.string('property_number', 64).nullable()
      t.decimal('quantity', 14, 4).notNullable().defaultTo(1)
      t.string('uom', 32).nullable()
      t.decimal('unit_cost', 14, 4).nullable()
      t.decimal('total_cost', 14, 4).nullable()
      t.string('condition', 64).nullable()
      t.jsonb('metadata').nullable()
    })

    this.s.createTable('physical_count_sessions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('session_no', 64).notNullable()
      t.string('count_type', 32).notNullable().defaultTo('stock')
      t.uuid('warehouse_id').nullable().references('id').inTable(uimsTable('warehouses')).onDelete('SET NULL')
      t.uuid('campus_id').nullable().references('id').inTable(uimsTable('campuses')).onDelete('SET NULL')
      t.string('status', 32).notNullable().defaultTo('open')
      t.date('scheduled_date').nullable()
      t.uuid('coa_document_id').nullable().references('id').inTable(uimsTable('coa_documents')).onDelete('SET NULL')
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('closed_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'session_no'])
    })

    this.s.createTable('physical_count_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('session_id').notNullable().references('id').inTable(uimsTable('physical_count_sessions')).onDelete('CASCADE')
      t.uuid('item_id').nullable().references('id').inTable(uimsTable('items')).onDelete('SET NULL')
      t.uuid('asset_id').nullable().references('id').inTable(uimsTable('assets')).onDelete('SET NULL')
      t.uuid('warehouse_id').nullable().references('id').inTable(uimsTable('warehouses')).onDelete('SET NULL')
      t.uuid('bin_id').nullable().references('id').inTable(uimsTable('warehouse_bins')).onDelete('SET NULL')
      t.decimal('system_qty', 14, 4).notNullable().defaultTo(0)
      t.decimal('counted_qty', 14, 4).nullable()
      t.decimal('variance_qty', 14, 4).nullable()
      t.string('condition', 64).nullable()
      t.string('barcode_scanned', 128).nullable()
      t.decimal('gps_lat', 10, 7).nullable()
      t.decimal('gps_lng', 10, 7).nullable()
      t.string('photo_url', 500).nullable()
      t.boolean('found_untagged').notNullable().defaultTo(false)
      t.uuid('scanned_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('scanned_at', { useTz: true }).nullable()
      t.text('notes').nullable()
      t.index(['session_id'])
    })

    this.s.createTable('asset_depreciation_profiles', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('asset_id').notNullable().references('id').inTable(uimsTable('assets')).onDelete('CASCADE')
      t.string('method', 32).notNullable().defaultTo('straight_line')
      t.integer('useful_life_months').notNullable()
      t.decimal('residual_rate', 5, 4).notNullable().defaultTo(0.05)
      t.decimal('acquisition_cost', 14, 2).notNullable()
      t.date('in_service_date').notNullable()
      t.decimal('accum_depr', 14, 2).notNullable().defaultTo(0)
      t.decimal('book_value', 14, 2).notNullable()
      t.boolean('active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['asset_id'])
    })

    this.s.createTable('asset_depreciation_entries', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('profile_id').notNullable().references('id').inTable(uimsTable('asset_depreciation_profiles')).onDelete('CASCADE')
      t.uuid('asset_id').notNullable().references('id').inTable(uimsTable('assets')).onDelete('CASCADE')
      t.integer('period_year').notNullable()
      t.integer('period_month').notNullable()
      t.decimal('depr_amount', 14, 2).notNullable()
      t.decimal('accum_depr_after', 14, 2).notNullable()
      t.decimal('book_value_after', 14, 2).notNullable()
      t.timestamp('posted_at', { useTz: true }).notNullable()
      t.unique(['asset_id', 'period_year', 'period_month'])
    })

    this.s.createTable('property_ledger_entries', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('asset_id').notNullable().references('id').inTable(uimsTable('assets')).onDelete('CASCADE')
      t.string('entry_type', 32).notNullable()
      t.string('reference', 120).nullable()
      t.decimal('debit', 14, 2).notNullable().defaultTo(0)
      t.decimal('credit', 14, 2).notNullable().defaultTo(0)
      t.decimal('balance_after', 14, 2).notNullable()
      t.text('narrative').nullable()
      t.uuid('coa_document_id').nullable().references('id').inTable(uimsTable('coa_documents')).onDelete('SET NULL')
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('occurred_at', { useTz: true }).notNullable()
      t.index(['organization_id', 'asset_id'])
    })

    this.schema.raw(`
      ALTER TABLE ${uimsTable('assets')}
        ADD COLUMN IF NOT EXISTS qr_payload text NULL,
        ADD COLUMN IF NOT EXISTS useful_life_months integer NULL,
        ADD COLUMN IF NOT EXISTS residual_rate numeric(5,4) NULL DEFAULT 0.05
    `)
  }

  async down() {
    this.s.dropTableIfExists('property_ledger_entries')
    this.s.dropTableIfExists('asset_depreciation_entries')
    this.s.dropTableIfExists('asset_depreciation_profiles')
    this.s.dropTableIfExists('physical_count_lines')
    this.s.dropTableIfExists('physical_count_sessions')
    this.s.dropTableIfExists('coa_document_lines')
    this.s.dropTableIfExists('coa_documents')
    this.s.dropTableIfExists('supply_requisition_lines')
    this.s.dropTableIfExists('supply_requisitions')
    this.s.dropTableIfExists('stock_reservations')
    this.s.dropTableIfExists('suppliers')
  }
}
