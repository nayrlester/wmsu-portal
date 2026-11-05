import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import DocumentFile from '#modules/documents/models/document_file'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { FileNotFoundException } from '#modules/documents/domain/files/file_exceptions'

export class DocumentFileRepository {
  async countByDocument(documentId: string): Promise<number> {
    const tenantId = tenantContext.requireTenantId()
    const row = await DocumentFile.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNull('deleted_at')
      .count('* as total')
      .first()

    return Number(row?.$extras.total ?? 0)
  }

  async listByDocument(documentId: string, versionId?: string): Promise<DocumentFile[]> {
    const tenantId = tenantContext.requireTenantId()
    const query = DocumentFile.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')

    if (versionId) {
      query.where('version_id', versionId)
    }

    return query
  }

  async findByIdOrFail(documentId: string, fileId: string): Promise<DocumentFile> {
    const tenantId = tenantContext.requireTenantId()
    const file = await DocumentFile.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .where('id', fileId)
      .whereNull('deleted_at')
      .first()

    if (!file) {
      throw new FileNotFoundException()
    }

    return file
  }

  async create(data: Partial<DocumentFile>): Promise<DocumentFile> {
    return DocumentFile.create(data)
  }

  async softDelete(file: DocumentFile): Promise<void> {
    file.deletedAt = DateTime.now()
    await file.save()
  }

  async updateVirusScanResult(fileId: string, scanned: boolean, clean: boolean | null): Promise<void> {
    await DocumentFile.query().where('id', fileId).update({
      virus_scanned: scanned,
      virus_clean: clean,
    })
  }

  async updateExtractedMetadata(fileId: string, metadata: Record<string, unknown>): Promise<void> {
    await DocumentFile.query().where('id', fileId).update({
      extracted_metadata: metadata,
    })
  }

  async countCreatedByDay(days = 30): Promise<Array<{ day: string; count: number }>> {
    const tenantId = tenantContext.requireTenantId()
    const boundedDays = Math.min(Math.max(days, 1), 90)
    const start = DateTime.now().minus({ days: boundedDays - 1 }).startOf('day')

    const rows = await DocumentFile.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where('created_at', '>=', start.toSQL()!)
      .select(db.raw(`to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day_key`))
      .count('* as total')
      .groupByRaw(`date_trunc('day', created_at)`)
      .orderByRaw(`date_trunc('day', created_at) asc`)

    const countsByDay = rows.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.$extras.day_key)] = Number(row.$extras.total ?? 0)
      return acc
    }, {})

    return Array.from({ length: boundedDays }, (_, index) => {
      const day = start.plus({ days: index })
      const key = day.toFormat('yyyy-MM-dd')
      return {
        day: day.toFormat('MMM d'),
        count: countsByDay[key] ?? 0,
      }
    })
  }
}

export const documentFileRepository = new DocumentFileRepository()
