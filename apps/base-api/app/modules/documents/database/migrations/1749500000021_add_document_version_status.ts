import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('document_versions', (table) => {
      table.string('status', 50).notNullable().defaultTo('draft')
      table.timestamp('submitted_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('document_workflow_instances', (table) => {
      table
        .uuid('version_id')
        .nullable()
        .references('id')
        .inTable('document_versions')
        .onDelete('SET NULL')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE document_versions AS dv
        SET status = d.status
        FROM documents AS d
        WHERE dv.document_id = d.id
          AND dv.deleted_at IS NULL
          AND dv.id = (
            SELECT id
            FROM document_versions
            WHERE document_id = d.id
              AND deleted_at IS NULL
            ORDER BY version_number DESC, version_minor DESC
            LIMIT 1
          )
      `)

      await db.rawQuery(`
        UPDATE document_versions AS dv
        SET status = 'approved'
        FROM documents AS d
        WHERE dv.document_id = d.id
          AND d.status IN ('approved', 'completed')
          AND dv.deleted_at IS NULL
          AND dv.id <> (
            SELECT id
            FROM document_versions
            WHERE document_id = d.id
              AND deleted_at IS NULL
            ORDER BY version_number DESC, version_minor DESC
            LIMIT 1
          )
      `)
    })
  }

  async down() {
    this.schema.alterTable('document_workflow_instances', (table) => {
      table.dropColumn('version_id')
    })

    this.schema.alterTable('document_versions', (table) => {
      table.dropColumn('submitted_at')
      table.dropColumn('status')
    })
  }
}
