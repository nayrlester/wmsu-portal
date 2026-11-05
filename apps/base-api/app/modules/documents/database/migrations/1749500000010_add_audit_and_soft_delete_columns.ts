import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Phase 1 audit hardening: actor columns, soft deletes, and partial indexes.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('departments', (table) => {
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('document_types', (table) => {
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('documents', (table) => {
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
    })

    this.schema.alterTable('workflows', (table) => {
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('workflow_steps', (table) => {
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
    })

    this.schema.alterTable('approvals', (table) => {
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('comments', (table) => {
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
    })

    this.schema.alterTable('notifications', (table) => {
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('subscriptions', (table) => {
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('roles', (table) => {
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('document_files', (table) => {
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('document_versions', (table) => {
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('plans', (table) => {
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS idx_departments_tenant_active
          ON departments (tenant_id) WHERE deleted_at IS NULL
      `)
      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS idx_documents_tenant_status
          ON documents (tenant_id, status) WHERE deleted_at IS NULL
      `)
      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS idx_workflows_tenant_status
          ON workflows (tenant_id, status) WHERE deleted_at IS NULL
      `)
      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
          ON notifications (tenant_id, user_id, is_read) WHERE deleted_at IS NULL
      `)
      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
          ON audit_logs (tenant_id, created_at DESC)
      `)
      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status
          ON subscriptions (tenant_id, status) WHERE deleted_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.alterTable('departments', (table) => {
      table.dropColumn('created_by_id')
      table.dropColumn('updated_by_id')
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('document_types', (table) => {
      table.dropColumn('created_by_id')
      table.dropColumn('updated_by_id')
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('documents', (table) => {
      table.dropColumn('updated_by_id')
    })
    this.schema.alterTable('workflows', (table) => {
      table.dropColumn('updated_by_id')
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('workflow_steps', (table) => {
      table.dropColumn('created_by_id')
      table.dropColumn('updated_by_id')
    })
    this.schema.alterTable('approvals', (table) => {
      table.dropColumn('created_by_id')
      table.dropColumn('updated_by_id')
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('comments', (table) => {
      table.dropColumn('updated_by_id')
    })
    this.schema.alterTable('notifications', (table) => {
      table.dropColumn('created_by_id')
      table.dropColumn('updated_by_id')
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('subscriptions', (table) => {
      table.dropColumn('created_by_id')
      table.dropColumn('updated_by_id')
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('roles', (table) => {
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('document_files', (table) => {
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('document_versions', (table) => {
      table.dropColumn('deleted_at')
    })
    this.schema.alterTable('plans', (table) => {
      table.dropColumn('deleted_at')
    })

    this.defer(async (db) => {
      await db.rawQuery('DROP INDEX IF EXISTS idx_departments_tenant_active')
      await db.rawQuery('DROP INDEX IF EXISTS idx_documents_tenant_status')
      await db.rawQuery('DROP INDEX IF EXISTS idx_workflows_tenant_status')
      await db.rawQuery('DROP INDEX IF EXISTS idx_notifications_user_unread')
      await db.rawQuery('DROP INDEX IF EXISTS idx_audit_logs_tenant_created')
      await db.rawQuery('DROP INDEX IF EXISTS idx_subscriptions_tenant_status')
    })
  }
}
