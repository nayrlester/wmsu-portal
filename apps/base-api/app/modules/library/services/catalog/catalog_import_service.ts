import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Book from '#modules/library/models/book'
import CatalogVersionService from '#modules/library/services/catalog/catalog_version_service'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import type { AuditContext } from '#modules/library/services/audit/audit_service'
import AuditService from '#modules/library/services/audit/audit_service'
import { buildDublinCore, buildSearchText } from '#modules/library/services/books/book_helpers'
import { ULMIS_MATERIAL_TYPES } from '#modules/library/domain/ulmis_catalog'

export default class CatalogImportService {
  constructor(
    private auditService = new AuditService(),
    private versionService = new CatalogVersionService()
  ) {}

  async importCsv(csvText: string, userId?: string, auditCtx?: AuditContext) {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      throw new BusinessRuleException('CSV must include a header row and at least one data row')
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const titleIdx = headers.indexOf('title')
    if (titleIdx < 0) throw new BusinessRuleException('CSV must include a title column')

    const col = (name: string) => headers.indexOf(name)
    const authorsIdx = col('authors')
    const isbnIdx = col('isbn13')
    const genreIdx = col('genre')
    const digitalIdx = col('isdigital')
    const materialIdx = col('materialtype')
    const subjectsIdx = col('subjects')
    const classSchemeIdx = col('classificationscheme')
    const classNumberIdx = col('classificationnumber')
    const yearIdx = col('publicationyear')
    const issnIdx = col('issn')
    const publisherIdx = col('publisher')

    const tid = borrowingTenantId()
    const created: string[] = []
    const errors: Array<{ line: number; error: string }> = []

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i])
      try {
        const title = cols[titleIdx]?.trim()
        if (!title) throw new Error('Missing title')

        const authors = authorsIdx >= 0 ? cols[authorsIdx]?.trim() || null : null
        const isbn13 = isbnIdx >= 0 ? cols[isbnIdx]?.trim() || null : null
        const genre = genreIdx >= 0 ? cols[genreIdx]?.trim() || null : null
        const subjects = subjectsIdx >= 0 ? cols[subjectsIdx]?.trim() || null : null
        const issn = issnIdx >= 0 ? cols[issnIdx]?.trim() || null : null
        const publisherName = publisherIdx >= 0 ? cols[publisherIdx]?.trim() || null : null
        let materialType = materialIdx >= 0 ? cols[materialIdx]?.trim().toLowerCase() || 'book' : 'book'
        if (!(ULMIS_MATERIAL_TYPES as readonly string[]).includes(materialType)) {
          materialType = 'book'
        }
        const classificationScheme =
          classSchemeIdx >= 0 ? cols[classSchemeIdx]?.trim().toLowerCase() || null : null
        const classificationNumber =
          classNumberIdx >= 0 ? cols[classNumberIdx]?.trim() || null : null
        const publicationYear =
          yearIdx >= 0 && cols[yearIdx]?.trim() ? Number(cols[yearIdx]) : null

        if (isbn13) {
          const existing = await Book.query()
            .where('tenant_id', tid)
            .where('isbn13', isbn13)
            .whereNull('deleted_at')
            .first()
          if (existing) throw new Error(`Duplicate ISBN-13: ${isbn13}`)
        }

        await db.transaction(async (trx) => {
          const book = await Book.create(
            {
              tenantId: tid,
              title,
              subtitle: null,
              authorNames: authors,
              subjectNames: subjects,
              isbn13,
              issn,
              genre,
              materialType,
              classificationScheme:
                classificationScheme === 'ddc' || classificationScheme === 'lcc'
                  ? classificationScheme
                  : null,
              classificationNumber,
              publicationYear:
                publicationYear && Number.isFinite(publicationYear) ? publicationYear : null,
              isDigital:
                digitalIdx >= 0
                  ? ['1', 'true', 'yes'].includes((cols[digitalIdx] ?? '').toLowerCase())
                  : materialType === 'electronic',
              marcControlNumber: null,
              marcFields: null,
              dublinCore: buildDublinCore({
                title,
                authorNames: authors,
                subjectNames: subjects,
                publisherName,
                isbn13,
                issn,
                publicationYear:
                  publicationYear && Number.isFinite(publicationYear) ? publicationYear : null,
                materialType,
              }),
              metadataVersion: 1,
              searchText: buildSearchText({
                title,
                authorNames: authors,
                subjectNames: subjects,
                isbn13,
                issn,
                genre,
                publisherName,
                classificationNumber,
                materialType,
              }),
            },
            { client: trx }
          )

          await this.versionService.record(book, userId, trx)
          created.push(book.id)
        })
      } catch (error) {
        errors.push({
          line: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    await this.auditService.log(
      'create',
      'catalog_import',
      tid,
      null,
      { created: created.length, errors: errors.length, format: 'csv' },
      auditCtx
    )

    return { createdCount: created.length, createdIds: created, errors }
  }

  async importMarcJson(
    records: Array<Record<string, unknown>>,
    userId?: string,
    auditCtx?: AuditContext
  ) {
    const tid = borrowingTenantId()
    const created: string[] = []
    const errors: Array<{ index: number; error: string }> = []

    for (let index = 0; index < records.length; index++) {
      const record = records[index]
      try {
        const fields = (record.fields ?? {}) as Record<string, string>
        const title = fields['245'] || fields.title
        if (!title) throw new Error('Missing title (245)')

        const authorNames = fields['100'] || fields.author || null
        const isbn13 = fields['020'] || fields.isbn || null
        const issn = fields['022'] || fields.issn || null
        const subjects = fields['650'] || fields.subject || null
        const classDdc = fields['082'] || null
        const classLcc = fields['050'] || null

        await db.transaction(async (trx) => {
          const book = await Book.create(
            {
              tenantId: tid,
              title: String(title),
              subtitle: null,
              authorNames,
              subjectNames: subjects,
              isbn13,
              issn,
              materialType: 'book',
              classificationScheme: classDdc ? 'ddc' : classLcc ? 'lcc' : null,
              classificationNumber: classDdc || classLcc || null,
              marcControlNumber: (record.controlNumber as string) ?? null,
              marcFields: fields,
              dublinCore: buildDublinCore({
                title: String(title),
                authorNames,
                subjectNames: subjects,
                isbn13,
                issn,
                materialType: 'book',
              }),
              isDigital: false,
              metadataVersion: 1,
              searchText: buildSearchText({
                title: String(title),
                authorNames,
                subjectNames: subjects,
                isbn13,
                issn,
                classificationNumber: classDdc || classLcc,
                materialType: 'book',
              }),
            },
            { client: trx }
          )
          await this.versionService.record(book, userId, trx)
          created.push(book.id)
        })
      } catch (error) {
        errors.push({
          index,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    await this.auditService.log(
      'create',
      'catalog_import',
      tid,
      null,
      { format: 'marc_json', created: created.length, errors: errors.length },
      auditCtx
    )

    return { createdCount: created.length, createdIds: created, errors }
  }

  async importXlsxBase64(base64: string, userId?: string, auditCtx?: AuditContext) {
    const XLSX = await import('xlsx')
    const buffer = Buffer.from(base64, 'base64')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new BusinessRuleException('Workbook has no sheets')
    }
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (!rows.length) {
      throw new BusinessRuleException('Sheet has no data rows')
    }

    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const raw = String(row[h] ?? '')
            return raw.includes(',') || raw.includes('"')
              ? `"${raw.replace(/"/g, '""')}"`
              : raw
          })
          .join(',')
      ),
    ]
    return this.importCsv(csvLines.join('\n'), userId, auditCtx)
  }

  async versions(bookId: string) {
    return this.versionService.listForBook(bookId)
  }

  private parseCsvLine(line: string) {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (ch === ',' && !inQuotes) {
        result.push(current)
        current = ''
        continue
      }
      current += ch
    }
    result.push(current)
    return result
  }
}
