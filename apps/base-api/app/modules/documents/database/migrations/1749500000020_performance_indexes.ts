import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Performance indexes: aligned FTS, composite tenant filters, file/user/notification/audit paths.
 * Uses CONCURRENTLY where possible (migration runs outside a transaction).
 */
export default class extends BaseSchema {
  static disableTransactions = true

  async up() {
    await this.schema.raw(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)

    await this.schema.raw(`DROP INDEX IF EXISTS documents_search_idx`)
    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS documents_search_idx ON documents
      USING gin(
        to_tsvector(
          'english',
          coalesce(title, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          coalesce(tracking_number, '') || ' ' ||
          coalesce(ai_summary, '') || ' ' ||
          coalesce(content_html, '')
        )
      )
    `)

    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_tenant_created_active
      ON documents (tenant_id, created_at DESC)
      WHERE deleted_at IS NULL
    `)
    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_tenant_status_created_active
      ON documents (tenant_id, status, created_at DESC)
      WHERE deleted_at IS NULL
    `)
    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_tenant_assigned_active
      ON documents (tenant_id, assigned_to_id)
      WHERE deleted_at IS NULL
    `)
    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_tenant_type_active
      ON documents (tenant_id, document_type_id)
      WHERE deleted_at IS NULL
    `)
    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_tenant_updated_active
      ON documents (tenant_id, updated_at DESC)
      WHERE deleted_at IS NULL
    `)

    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_last_login
      ON users (tenant_id, last_login_at DESC)
      WHERE deleted_at IS NULL
    `)

    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_inbox
      ON notifications (tenant_id, user_id, created_at DESC)
      WHERE deleted_at IS NULL
    `)

    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_document_id_expr
      ON audit_logs (tenant_id, created_at DESC)
      WHERE coalesce(new_values->>'documentId', metadata->>'documentId') IS NOT NULL
    `)

    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_files_name_trgm
      ON document_files USING gin (original_name gin_trgm_ops)
      WHERE deleted_at IS NULL
    `)
    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_files_search_text_gin
      ON document_files USING gin (
        to_tsvector('simple', coalesce(extracted_metadata->>'searchText', ''))
      )
      WHERE deleted_at IS NULL
    `)

    await this.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_versions_doc_order
      ON document_versions (document_id, version_number DESC, version_minor DESC)
      WHERE deleted_at IS NULL
    `)

    await this.schema.raw(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_document_stats AS
      SELECT
        tenant_id,
        status,
        count(*)::bigint AS doc_count,
        max(updated_at) AS last_updated
      FROM documents
      WHERE deleted_at IS NULL
      GROUP BY tenant_id, status
    `)
    await this.schema.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tenant_document_stats
      ON mv_tenant_document_stats (tenant_id, status)
    `)
  }

  async down() {
    await this.schema.raw(`DROP MATERIALIZED VIEW IF EXISTS mv_tenant_document_stats`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_document_versions_doc_order`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_document_files_search_text_gin`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_document_files_name_trgm`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_audit_logs_document_id_expr`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_notifications_inbox`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_users_tenant_last_login`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_documents_tenant_updated_active`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_documents_tenant_type_active`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_documents_tenant_assigned_active`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_documents_tenant_status_created_active`)
    await this.schema.raw(`DROP INDEX IF EXISTS idx_documents_tenant_created_active`)
    await this.schema.raw(`DROP INDEX IF EXISTS documents_search_idx`)
    await this.schema.raw(`
      CREATE INDEX IF NOT EXISTS documents_search_idx ON documents
      USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || tracking_number))
    `)
  }
}
