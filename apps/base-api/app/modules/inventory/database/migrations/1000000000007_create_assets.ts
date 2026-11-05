import { UimsSchema, uimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('assets', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('asset_code', 32).notNullable()
      t.string('property_number', 64).nullable()
      t.string('barcode', 64).nullable()
      t.string('name', 255).notNullable()
      t.text('description').nullable()
      t.string('asset_type', 32).notNullable().defaultTo('equipment')
      t.string('serial_number', 120).nullable()
      t.string('model', 120).nullable()
      t.string('manufacturer', 120).nullable()
      t.string('fund_source', 120).nullable()
      t.uuid('office_id').nullable().references('id').inTable(uimsTable('offices')).onDelete('SET NULL')
      t.date('purchase_date').nullable()
      t.decimal('purchase_cost', 14, 2).nullable()
      t.date('warranty_expires_at').nullable()
      t.string('status', 32).notNullable().defaultTo('available')
      t.string('lifecycle_stage', 32).notNullable().defaultTo('active')
      t.uuid('current_assignment_id').nullable()
      t.string('custodian_external_id', 64).nullable()
      t.string('custodian_name', 255).nullable()
      t.string('custodian_email', 255).nullable()
      t.text('notes').nullable()
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.uuid('updated_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.timestamp('deleted_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'asset_code'])
      t.index(['custodian_external_id'])
      t.index(['status'])
    })

    this.s.createTable('asset_assignments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('asset_id').notNullable().references('id').inTable(uimsTable('assets')).onDelete('CASCADE')
      t.string('custodian_external_id', 64).notNullable()
      t.string('custodian_name', 255).nullable()
      t.string('custodian_email', 255).nullable()
      t.timestamp('assigned_at', { useTz: true }).notNullable()
      t.uuid('assigned_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('expected_return_at', { useTz: true }).nullable()
      t.timestamp('returned_at', { useTz: true }).nullable()
      t.uuid('returned_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.string('return_condition', 64).nullable()
      t.text('return_notes').nullable()
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['asset_id'])
      t.index(['custodian_external_id'])
    })

    this.s.createTable('asset_lifecycle_events', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('asset_id').notNullable().references('id').inTable(uimsTable('assets')).onDelete('CASCADE')
      t.string('event_type', 32).notNullable()
      t.string('from_status', 32).nullable()
      t.string('to_status', 32).nullable()
      t.jsonb('metadata').nullable()
      t.timestamp('occurred_at', { useTz: true }).notNullable()
      t.uuid('actor_user_id').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.index(['asset_id'])
    })

    this.s.createTable('asset_maintenance_records', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('asset_id').notNullable().references('id').inTable(uimsTable('assets')).onDelete('CASCADE')
      t.string('title', 255).notNullable()
      t.text('description').nullable()
      t.string('maintenance_type', 32).notNullable().defaultTo('preventive')
      t.timestamp('scheduled_at', { useTz: true }).notNullable()
      t.timestamp('completed_at', { useTz: true }).nullable()
      t.string('status', 32).notNullable().defaultTo('scheduled')
      t.uuid('assigned_to_user_id').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.decimal('cost', 14, 2).nullable()
      t.text('notes').nullable()
      t.uuid('created_by').nullable().references('id').inTable(uimsTable('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['asset_id'])
    })

    const schema = uimsSchema()
    this.schema.raw(`
      ALTER TABLE ${schema}.assets
      ADD CONSTRAINT fk_assets_current_assignment
      FOREIGN KEY (current_assignment_id) REFERENCES ${schema}.asset_assignments(id)
      ON DELETE SET NULL
    `)
  }

  async down() {
    const schema = uimsSchema()
    this.schema.raw(`ALTER TABLE ${schema}.assets DROP CONSTRAINT IF EXISTS fk_assets_current_assignment`)
    this.s.dropTableIfExists('asset_maintenance_records')
    this.s.dropTableIfExists('asset_lifecycle_events')
    this.s.dropTableIfExists('asset_assignments')
    this.s.dropTableIfExists('assets')
  }
}
