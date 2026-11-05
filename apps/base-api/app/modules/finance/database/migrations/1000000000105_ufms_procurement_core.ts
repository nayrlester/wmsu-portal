import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.schema.raw(`
      ALTER TABLE ${uimsTable('suppliers')}
        ADD COLUMN IF NOT EXISTS payment_terms varchar(255) NULL,
        ADD COLUMN IF NOT EXISTS eligibility_valid_until date NULL,
        ADD COLUMN IF NOT EXISTS eligibility_notes text NULL,
        ADD COLUMN IF NOT EXISTS performance_notes text NULL
    `)

    this.schema.raw(`
      ALTER TABLE ${uimsTable('purchase_requisitions')}
        ADD COLUMN IF NOT EXISTS fiscal_year varchar(4) NULL,
        ADD COLUMN IF NOT EXISTS fund_id uuid NULL REFERENCES ${uimsTable('funds')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS account_id uuid NULL REFERENCES ${uimsTable('chart_of_accounts')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS budget_line_id uuid NULL REFERENCES ${uimsTable('budget_lines')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS financial_plan_id uuid NULL REFERENCES ${uimsTable('financial_plans')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS budget_check_sufficient boolean NULL,
        ADD COLUMN IF NOT EXISTS budget_check_available numeric(15,2) NULL,
        ADD COLUMN IF NOT EXISTS budget_checked_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS rejection_reason text NULL,
        ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS created_by uuid NULL REFERENCES ${uimsTable('users')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_by uuid NULL REFERENCES ${uimsTable('users')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS submitted_by uuid NULL REFERENCES ${uimsTable('users')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS approved_by uuid NULL REFERENCES ${uimsTable('users')}(id) ON DELETE SET NULL
    `)

    this.schema.raw(`
      CREATE INDEX IF NOT EXISTS purchase_requisitions_org_status_idx
        ON ${uimsTable('purchase_requisitions')} (organization_id, status);
      CREATE INDEX IF NOT EXISTS purchase_requisitions_org_fy_idx
        ON ${uimsTable('purchase_requisitions')} (organization_id, fiscal_year);
    `)

    this.s.createTable('purchase_requisition_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('purchase_requisition_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('purchase_requisitions'))
        .onDelete('RESTRICT')
      t.integer('line_no').notNullable()
      t.string('description', 500).notNullable()
      t.decimal('quantity', 15, 4).notNullable().defaultTo(1)
      t.string('uom', 32).nullable()
      t.decimal('unit_cost', 15, 2).nullable()
      t.decimal('estimated_amount', 15, 2).nullable()
      t.uuid('item_id').nullable().references('id').inTable(uimsTable('items')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['purchase_requisition_id', 'line_no'])
    })

    this.s.createTable('procurement_rfqs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('purchase_requisition_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('purchase_requisitions'))
        .onDelete('RESTRICT')
      t.string('rfq_number', 64).notNullable()
      t.string('method', 32).notNullable().defaultTo('quotation')
      t.string('status', 32).notNullable().defaultTo('draft')
      t.string('philgeps_reference', 128).nullable()
      t.text('notes').nullable()
      t.timestamp('issued_at', { useTz: true }).nullable()
      t.timestamp('closed_at', { useTz: true }).nullable()
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'rfq_number'])
      t.index(['organization_id', 'status'])
    })

    this.s.createTable('procurement_quotations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('rfq_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_rfqs'))
        .onDelete('RESTRICT')
      t.uuid('supplier_id').notNullable().references('id').inTable(uimsTable('suppliers')).onDelete('RESTRICT')
      t.string('quotation_ref', 128).nullable()
      t.decimal('amount', 15, 2).notNullable()
      t.timestamp('submitted_at', { useTz: true }).nullable()
      t.text('notes').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'rfq_id'])
    })

    this.s.createTable('procurement_abstracts', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('rfq_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_rfqs'))
        .onDelete('RESTRICT')
      t.string('abstract_number', 64).notNullable()
      t.string('status', 32).notNullable().defaultTo('draft')
      t.text('notes').nullable()
      t.timestamp('prepared_at', { useTz: true }).nullable()
      t.uuid('prepared_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'abstract_number'])
    })

    this.s.createTable('procurement_abstract_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('abstract_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_abstracts'))
        .onDelete('RESTRICT')
      t
        .uuid('quotation_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_quotations'))
        .onDelete('RESTRICT')
      t.integer('line_no').notNullable()
      t.text('remarks').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.unique(['abstract_id', 'line_no'])
      t.unique(['abstract_id', 'quotation_id'])
    })

    this.s.createTable('procurement_awards', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('rfq_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_rfqs'))
        .onDelete('RESTRICT')
      t
        .uuid('abstract_id')
        .nullable()
        .references('id')
        .inTable(uimsTable('procurement_abstracts'))
        .onDelete('SET NULL')
      t
        .uuid('quotation_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_quotations'))
        .onDelete('RESTRICT')
      t.uuid('supplier_id').notNullable().references('id').inTable(uimsTable('suppliers')).onDelete('RESTRICT')
      t.decimal('awarded_amount', 15, 2).notNullable()
      t.string('philgeps_reference', 128).nullable()
      t.string('status', 32).notNullable().defaultTo('awarded')
      t.timestamp('awarded_at', { useTz: true }).nullable()
      t.uuid('awarded_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.text('notes').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status'])
    })

    this.schema.raw(`
      ALTER TABLE ${uimsTable('purchase_orders')}
        ADD COLUMN IF NOT EXISTS supplier_id uuid NULL REFERENCES ${uimsTable('suppliers')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS award_id uuid NULL REFERENCES ${uimsTable('procurement_awards')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS philgeps_reference varchar(128) NULL,
        ADD COLUMN IF NOT EXISTS contract_number varchar(128) NULL,
        ADD COLUMN IF NOT EXISTS fiscal_year varchar(4) NULL,
        ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS approved_by uuid NULL REFERENCES ${uimsTable('users')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_by uuid NULL REFERENCES ${uimsTable('users')}(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_by uuid NULL REFERENCES ${uimsTable('users')}(id) ON DELETE SET NULL
    `)

    this.schema.raw(`
      CREATE INDEX IF NOT EXISTS purchase_orders_org_status_idx
        ON ${uimsTable('purchase_orders')} (organization_id, status);
    `)

    this.s.createTable('purchase_order_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('purchase_order_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('purchase_orders'))
        .onDelete('RESTRICT')
      t.integer('line_no').notNullable()
      t.string('description', 500).notNullable()
      t.decimal('quantity', 15, 4).notNullable().defaultTo(1)
      t.string('uom', 32).nullable()
      t.decimal('unit_cost', 15, 2).notNullable().defaultTo(0)
      t.decimal('line_amount', 15, 2).notNullable().defaultTo(0)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['purchase_order_id', 'line_no'])
    })

    this.s.createTable('procurement_deliveries', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('purchase_order_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('purchase_orders'))
        .onDelete('RESTRICT')
      t.string('delivery_number', 64).notNullable()
      t.date('delivered_on').notNullable()
      t.string('status', 32).notNullable().defaultTo('recorded')
      t.text('notes').nullable()
      t.uuid('received_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'delivery_number'])
    })

    this.s.createTable('procurement_delivery_lines', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('delivery_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_deliveries'))
        .onDelete('RESTRICT')
      t
        .uuid('purchase_order_line_id')
        .nullable()
        .references('id')
        .inTable(uimsTable('purchase_order_lines'))
        .onDelete('SET NULL')
      t.integer('line_no').notNullable()
      t.decimal('quantity_delivered', 15, 4).notNullable()
      t.string('condition_notes', 500).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.unique(['delivery_id', 'line_no'])
    })

    this.s.createTable('inspection_acceptance_reports', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('purchase_order_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('purchase_orders'))
        .onDelete('RESTRICT')
      t
        .uuid('delivery_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('procurement_deliveries'))
        .onDelete('RESTRICT')
      t.string('iar_number', 64).notNullable()
      t.string('result', 32).notNullable().defaultTo('accepted')
      t.string('status', 32).notNullable().defaultTo('issued')
      t.text('notes').nullable()
      t.timestamp('inspected_at', { useTz: true }).nullable()
      t.uuid('inspected_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.string('uims_sync_status', 32).notNullable().defaultTo('pending')
      t.timestamp('uims_synced_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'iar_number'])
      t.index(['organization_id', 'status'])
    })

    this.s.createTable('procurement_uims_events', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t
        .uuid('iar_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('inspection_acceptance_reports'))
        .onDelete('RESTRICT')
      t
        .uuid('purchase_order_id')
        .notNullable()
        .references('id')
        .inTable(uimsTable('purchase_orders'))
        .onDelete('RESTRICT')
      t.string('event_type', 64).notNullable().defaultTo('acceptance')
      t.string('status', 32).notNullable().defaultTo('pending')
      t.jsonb('payload').nullable()
      t.text('last_error').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status'])
    })

    this.s.createTable('procurement_document_refs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('RESTRICT')
      t.string('entity_type', 64).notNullable()
      t.uuid('entity_id').notNullable()
      t.string('category', 64).notNullable()
      t.string('file_name', 255).notNullable()
      t.string('external_ref', 255).nullable()
      t.string('mime_type', 128).nullable()
      t.bigInteger('size_bytes').nullable()
      t.uuid('uploaded_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.index(['organization_id', 'entity_type', 'entity_id'])
    })
  }

  async down() {
    this.s.dropTableIfExists('procurement_document_refs')
    this.s.dropTableIfExists('procurement_uims_events')
    this.s.dropTableIfExists('inspection_acceptance_reports')
    this.s.dropTableIfExists('procurement_delivery_lines')
    this.s.dropTableIfExists('procurement_deliveries')
    this.s.dropTableIfExists('purchase_order_lines')
    this.s.dropTableIfExists('procurement_awards')
    this.s.dropTableIfExists('procurement_abstract_lines')
    this.s.dropTableIfExists('procurement_abstracts')
    this.s.dropTableIfExists('procurement_quotations')
    this.s.dropTableIfExists('procurement_rfqs')
    this.s.dropTableIfExists('purchase_requisition_lines')
  }
}
