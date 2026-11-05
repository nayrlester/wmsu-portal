import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      CREATE TABLE search_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        entity_type VARCHAR(30) NOT NULL,
        entity_id UUID NOT NULL,
        label VARCHAR(500) NOT NULL,
        subtitle VARCHAR(500),
        search_vector TSVECTOR,
        metadata JSONB NOT NULL DEFAULT '{}',
        indexed_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, entity_type, entity_id)
      )
    `)
    await this.db.rawQuery(`
      CREATE INDEX idx_search_documents_tenant_type ON search_documents (tenant_id, entity_type)
    `)
    await this.db.rawQuery(`
      CREATE INDEX idx_search_documents_vector ON search_documents USING GIN(search_vector)
    `)
    await this.db.rawQuery(`
      CREATE INDEX idx_search_documents_metadata ON search_documents USING GIN(metadata jsonb_path_ops)
    `)
  }

  async down() {
    await this.db.rawQuery(`DROP TABLE IF EXISTS search_documents`)
  }
}
