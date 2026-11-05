import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Document from '#modules/documents/models/document'
import DocumentFile from '#modules/documents/models/document_file'
import DocumentVersion from '#modules/documents/models/document_version'
import type { DocumentListFilters } from '#modules/documents/domain/documents/document_dto'
import {
  decodeDocumentCursor,
  DOCUMENT_FTS_VECTOR,
  encodeDocumentCursor,
  normalizeListLimit,
  normalizeListPage,
} from '#modules/documents/domain/documents/document_search'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DocumentNotFoundException } from '#modules/documents/domain/documents/document_exceptions'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { DocumentStatus } from '#modules/documents/domain/enums/index'

export class DocumentRepository {
  private baseQuery() {
    return Document.query().withScopes((scopes) => {
      scopes.forTenant()
      scopes.notDeleted()
    })
  }

  async exists(id: string): Promise<boolean> {
    const row = await this.baseQuery().where('id', id).select('id').first()
    return Boolean(row)
  }

  async paginate(filters: DocumentListFilters) {
    if (filters.cursor) {
      return this.paginateByCursor(filters)
    }

    const page = normalizeListPage(filters.page)
    const limit = normalizeListLimit(filters.limit)

    const query = this.buildListQuery(filters).orderBy('created_at', 'desc')

    return query.paginate(page, limit)
  }

  private async paginateByCursor(filters: DocumentListFilters) {
    const limit = normalizeListLimit(filters.limit)
    const decoded = decodeDocumentCursor(filters.cursor!)
    if (!decoded) {
      return this.paginate({ ...filters, cursor: undefined, page: 1 })
    }

    const query = this.buildListQuery(filters)
      .where((builder) => {
        builder
          .where('created_at', '<', decoded.createdAt)
          .orWhere((nested) => {
            nested.where('created_at', decoded.createdAt).where('id', '<', decoded.id)
          })
      })
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)

    const rows = await query
    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows
    const last = data[data.length - 1]

    return {
      all: () => data,
      getMeta: () => ({
        total: data.length,
        perPage: limit,
        currentPage: null,
        lastPage: null,
        firstPage: 1,
        firstPageUrl: null,
        lastPageUrl: null,
        nextPageUrl: hasMore && last ? encodeDocumentCursor(last.createdAt.toISO()!, last.id) : null,
        previousPageUrl: null,
      }),
    }
  }

  private buildListQuery(filters: DocumentListFilters) {
    const query = this.baseQuery()
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .preload('assignedTo')
      .preload('files', (fileQuery) => {
        fileQuery.whereNull('deleted_at').orderBy('created_at', 'asc').limit(1)
      })

    if (filters.viewerUserId) {
      this.applyDraftVisibilityScope(query, filters.viewerUserId)
    }

    this.applyFilters(query, filters)
    return query
  }

  applyDraftVisibilityScope(
    query: ReturnType<typeof Document.query>,
    viewerUserId: string
  ): void {
    query.where((sub) => {
      sub
        .whereNot('status', DocumentStatus.DRAFT)
        .orWhere('created_by_id', viewerUserId)
        // Digitization / physical-intake drafts must remain listable for records desk staff
        .orWhereNotNull('ocr_qa_status')
        .orWhereNotNull('physical_box_id')
    })
  }

  async search(filters: DocumentListFilters) {
    return this.paginate(filters)
  }

  async findByIdSummary(id: string, viewerUserId?: string): Promise<Document> {
    const document = await this.baseQuery()
      .where('id', id)
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .preload('assignedTo')
      .preload('files', (q) => q.whereNull('deleted_at').orderBy('created_at', 'asc').limit(1))
      .preload('approvals', (q) => q.preload('approver').orderBy('acted_at', 'desc').limit(1))
      .preload('versions', (q) =>
        q
          .whereNull('deleted_at')
          .orderBy('version_number', 'desc')
          .orderBy('version_minor', 'desc')
          .limit(1)
          .preload('createdBy')
      )
      .first()

    if (!document) {
      throw new DocumentNotFoundException()
    }

    if (viewerUserId) {
      DocumentAccessPolicy.assertCanView(document, viewerUserId)
    }

    return document
  }

  async findByIdOrFail(id: string, viewerUserId?: string): Promise<Document> {
    const document = await this.baseQuery()
      .where('id', id)
      .preload('documentType')
      .preload('department')
      .preload('createdBy')
      .preload('assignedTo')
      .preload('files', (q) => q.whereNull('deleted_at').orderBy('created_at', 'asc'))
      .preload('versions')
      .preload('approvals', (q) => q.preload('approver').orderBy('acted_at', 'desc'))
      .preload('routingEntries', (q) =>
        q.preload('fromUser').preload('toUser').orderBy('routed_at', 'desc')
      )
      .first()

    if (!document) {
      throw new DocumentNotFoundException()
    }

    if (viewerUserId) {
      DocumentAccessPolicy.assertCanView(document, viewerUserId)
    }

    return document
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Document> {
    const normalized = trackingNumber.trim().toUpperCase()
    const document = await Document.query()
      .whereRaw('UPPER(tracking_number) = ?', [normalized])
      .whereNull('deleted_at')
      .preload('department')
      .preload('documentType')
      .first()

    if (!document) {
      throw new DocumentNotFoundException()
    }

    return document
  }

  async create(data: Partial<Document>): Promise<Document> {
    return Document.create(data)
  }

  async save(document: Document): Promise<Document> {
    await document.save()
    return document
  }

  async softDelete(document: Document): Promise<void> {
    document.deletedAt = DateTime.now()
    await document.save()
  }

  async createVersion(data: {
    tenantId: string
    documentId: string
    versionNumber: number
    versionMinor?: number
    changeNotes: string
    createdById: string
    contentHtml?: string | null
    sourceType?: string
  }): Promise<DocumentVersion> {
    return DocumentVersion.create({
      ...data,
      versionMinor: data.versionMinor ?? 0,
      status: DocumentStatus.DRAFT,
    })
  }

  async countByStatus(statuses: string[]): Promise<number> {
    const result = await this.baseQuery().whereIn('status', statuses).count('* as total')
    return Number(result[0]?.$extras.total ?? 0)
  }

  async countAll(): Promise<number> {
    const result = await this.baseQuery().count('* as total')
    return Number(result[0]?.$extras.total ?? 0)
  }

  async countByStatusValue(status: string): Promise<number> {
    const result = await this.baseQuery().where('status', status).count('* as total')
    return Number(result[0]?.$extras.total ?? 0)
  }

  async countByStatusGrouped(): Promise<Record<string, number>> {
    const tenantId = tenantContext.requireTenantId()

    try {
      const rows = await db
        .from('mv_tenant_document_stats')
        .where('tenant_id', tenantId)
        .select('status', 'doc_count')

      if (rows.length > 0) {
        return rows.reduce<Record<string, number>>((acc, row) => {
          acc[String(row.status)] = Number(row.doc_count ?? 0)
          return acc
        }, {})
      }
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code !== '42P01') {
        throw error
      }
    }

    const fallback = await this.baseQuery().groupBy('status').select('status').count('* as total')
    return fallback.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.$extras.total ?? 0)
      return acc
    }, {})
  }

  async countCreatedByMonth(months = 6): Promise<Array<{ month: string; count: number }>> {
    const boundedMonths = Math.min(Math.max(months, 1), 12)
    const start = DateTime.now()
      .minus({ months: boundedMonths - 1 })
      .startOf('month')

    const rows = await this.baseQuery()
      .where('created_at', '>=', start.toSQL()!)
      .select(db.raw(`to_char(date_trunc('month', created_at), 'YYYY-MM') as month_key`))
      .count('* as total')
      .groupByRaw(`date_trunc('month', created_at)`)
      .orderByRaw(`date_trunc('month', created_at) asc`)

    const countsByMonth = rows.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.$extras.month_key)] = Number(row.$extras.total ?? 0)
      return acc
    }, {})

    return Array.from({ length: boundedMonths }, (_, index) => {
      const month = start.plus({ months: index })
      const key = month.toFormat('yyyy-MM')
      return {
        month: month.toFormat('MMM'),
        count: countsByMonth[key] ?? 0,
      }
    })
  }

  private applyFilters(query: ReturnType<typeof Document.query>, filters: DocumentListFilters) {
    if (filters.status) query.where('status', filters.status)
    if (filters.priority) query.where('priority', filters.priority)
    if (filters.departmentId) query.where('department_id', filters.departmentId)
    if (filters.documentTypeId) query.where('document_type_id', filters.documentTypeId)
    if (filters.napCategory) query.where('nap_category', filters.napCategory)
    if (filters.lifecycleStatus) query.where('lifecycle_status', filters.lifecycleStatus)
    if (filters.confidentiality) query.where('confidentiality', filters.confidentiality)
    if (filters.filePlanNodeId) query.where('file_plan_node_id', filters.filePlanNodeId)
    if (filters.originatingOfficeId) query.where('originating_office_id', filters.originatingOfficeId)
    if (filters.receivingOfficeId) query.where('receiving_office_id', filters.receivingOfficeId)
    if (filters.dueForArchive) {
      query.whereNotNull('retention_due_at').where('retention_due_at', '<=', DateTime.now().toSQL()!)
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim()
      tenantContext.requireTenantId()

      query.where((sub) => {
        sub
          .whereRaw(`${DOCUMENT_FTS_VECTOR} @@ plainto_tsquery('english', ?)`, [term])
          .orWhereILike('tracking_number', `%${term}%`)
          .orWhereRaw('UPPER(tracking_number) = ?', [term.toUpperCase()])
          .orWhereILike('title', `%${term}%`)
          .orWhereILike('subject_keywords', `%${term}%`)
          .orWhereILike('description', `%${term}%`)
          .orWhereExists(
            DocumentFile.query()
              .whereColumn('document_files.document_id', 'documents.id')
              .whereNull('document_files.deleted_at')
              .where((fileSub) => {
                fileSub
                  .whereILike('original_name', `%${term}%`)
                  .orWhereILike('file_name', `%${term}%`)
              })
          )
      })
    }
  }
}

export const documentRepository = new DocumentRepository()
