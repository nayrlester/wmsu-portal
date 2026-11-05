import Document from '#modules/documents/models/document'
import DocumentFile from '#modules/documents/models/document_file'
import User from '#modules/documents/models/user'
import Workflow from '#modules/documents/models/workflow'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import type {
  SearchDocumentHit,
  SearchFileHit,
  SearchUserHit,
  SearchWorkflowHit,
} from '#modules/documents/domain/search/search_types'
import { DOCUMENT_FTS_VECTOR } from '#modules/documents/domain/documents/document_search'

const SNIPPET_RADIUS = 60

function splitKeywords(term: string): string[] {
  return term
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
}

function buildSnippet(text: string | null | undefined, term: string): string | null {
  if (!text?.trim()) return null

  const keywords = splitKeywords(term)
  const needle = keywords.find((keyword) => text.toLowerCase().includes(keyword.toLowerCase())) ?? term
  const lower = text.toLowerCase()
  const index = lower.indexOf(needle.toLowerCase())

  if (index === -1) return text.slice(0, SNIPPET_RADIUS * 2).trim() + (text.length > SNIPPET_RADIUS * 2 ? '…' : '')

  const start = Math.max(0, index - SNIPPET_RADIUS)
  const end = Math.min(text.length, index + needle.length + SNIPPET_RADIUS)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''

  return `${prefix}${text.slice(start, end).trim()}${suffix}`
}

function detectDocumentMatchField(
  doc: Document,
  term: string
): SearchDocumentHit['matchField'] {
  const lower = term.toLowerCase()

  if (doc.trackingNumber.toLowerCase().includes(lower)) return 'tracking_number'
  if (doc.title.toLowerCase().includes(lower)) return 'title'
  if (doc.description?.toLowerCase().includes(lower)) return 'description'
  if (doc.aiSummary?.toLowerCase().includes(lower)) return 'ai_summary'

  return 'content'
}

function documentSnippet(doc: Document, term: string, matchField: SearchDocumentHit['matchField']): string | null {
  switch (matchField) {
    case 'tracking_number':
      return doc.trackingNumber
    case 'title':
      return buildSnippet(doc.title, term)
    case 'description':
      return buildSnippet(doc.description, term)
    case 'ai_summary':
      return buildSnippet(doc.aiSummary, term)
    default:
      return buildSnippet(doc.description ?? doc.title, term)
  }
}

function detectFileMatchField(file: DocumentFile, term: string): SearchFileHit['matchField'] {
  const lower = term.toLowerCase()
  if (file.originalName.toLowerCase().includes(lower) || file.fileName.toLowerCase().includes(lower)) {
    return 'filename'
  }
  const content = fileOcrText(file)
  if (content?.toLowerCase().includes(lower)) {
    return 'content'
  }
  return 'content'
}

function fileSearchableTextSql(): string {
  return `coalesce(extracted_metadata->>'searchText', extracted_metadata->'ocr'->>'text', '')`
}

function fileOcrText(file: DocumentFile): string | null {
  const metadata = file.extractedMetadata as { searchText?: string; ocr?: { text?: string } } | null
  return metadata?.searchText ?? metadata?.ocr?.text ?? null
}

function fileOcrConfidence(file: DocumentFile): number | null {
  const metadata = file.extractedMetadata as {
    ocr?: { confidence?: number }
    confidence?: number
  } | null
  const value = metadata?.ocr?.confidence ?? metadata?.confidence
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export class SearchRepository {
  async searchDocuments(term: string, limit: number, viewerUserId?: string): Promise<SearchDocumentHit[]> {
    tenantContext.requireTenantId()

    const query = Document.query()
      .withScopes((scopes) => {
        scopes.forTenant()
        scopes.notDeleted()
      })
      .where((sub) => {
        sub
          .whereRaw(`${DOCUMENT_FTS_VECTOR} @@ plainto_tsquery('english', ?)`, [term])
          .orWhereILike('tracking_number', `%${term}%`)
          .orWhereRaw('UPPER(tracking_number) = ?', [term.toUpperCase()])
          .orWhereILike('title', `%${term}%`)
          .orWhereILike('description', `%${term}%`)
          .orWhereILike('subject_keywords', `%${term}%`)
          .orWhereILike('ai_summary', `%${term}%`)
      })

    if (viewerUserId) {
      documentRepository.applyDraftVisibilityScope(query, viewerUserId)
    }

    const documents = await query.orderBy('updated_at', 'desc').limit(limit)

    return documents.map((doc) => {
      const matchField = detectDocumentMatchField(doc, term)
      return {
        id: doc.id,
        title: doc.title,
        trackingNumber: doc.trackingNumber,
        status: doc.status,
        snippet: documentSnippet(doc, term, matchField),
        matchField,
      }
    })
  }

  async searchFiles(
    term: string,
    limit: number,
    viewerUserId?: string,
    minOcrConfidence?: number
  ): Promise<SearchFileHit[]> {
    const tenantId = tenantContext.requireTenantId()
    const keywords = splitKeywords(term)

    const query = DocumentFile.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .whereHas('document', (documentQuery) => {
        documentQuery.whereNull('deleted_at')
        if (viewerUserId) {
          documentRepository.applyDraftVisibilityScope(documentQuery, viewerUserId)
        }
      })
      .preload('document')
      .orderBy('created_at', 'desc')
      .limit(Math.max(limit * 3, limit))

    query.where((sub) => {
      sub
        .whereILike('original_name', `%${term}%`)
        .orWhereILike('file_name', `%${term}%`)
        .orWhereRaw(`${fileSearchableTextSql()} ILIKE ?`, [`%${term}%`])

      if (keywords.length > 1) {
        sub.orWhere((keywordGroup) => {
          for (const keyword of keywords) {
            keywordGroup.where((keywordSub) => {
              keywordSub
                .whereILike('original_name', `%${keyword}%`)
                .orWhereILike('file_name', `%${keyword}%`)
                .orWhereRaw(`${fileSearchableTextSql()} ILIKE ?`, [`%${keyword}%`])
            })
          }
        })
      }
    })

    if (typeof minOcrConfidence === 'number') {
      query.whereRaw(
        `coalesce((extracted_metadata->'ocr'->>'confidence')::float, (extracted_metadata->>'confidence')::float, 0) >= ?`,
        [minOcrConfidence]
      )
    }

    const files = await query
    return files.slice(0, limit).map((file) => {
      const matchField = detectFileMatchField(file, term)
      const ocrText = fileOcrText(file)
      const snippet =
        matchField === 'filename'
          ? file.originalName
          : buildSnippet(ocrText, term)

      return {
        id: file.id,
        documentId: file.documentId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: Number(file.fileSize),
        documentTitle: file.document.title,
        trackingNumber: file.document.trackingNumber,
        snippet,
        matchField,
        ocrConfidence: fileOcrConfidence(file),
      }
    })
  }

  async searchUsers(term: string, limit: number): Promise<SearchUserHit[]> {
    const tenantId = tenantContext.requireTenantId()

    const users = await User.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where((builder) => {
        builder.whereILike('email', `%${term}%`).orWhereILike('full_name', `%${term}%`)
      })
      .orderBy('full_name')
      .orderBy('email')
      .limit(limit)

    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      snippet: buildSnippet(user.fullName ?? user.email, term),
    }))
  }

  async searchWorkflows(term: string, limit: number): Promise<SearchWorkflowHit[]> {
    const tenantId = tenantContext.requireTenantId()

    const workflows = await Workflow.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where((builder) => {
        builder.whereILike('name', `%${term}%`).orWhereILike('description', `%${term}%`)
      })
      .orderBy('updated_at', 'desc')
      .limit(limit)

    return workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      snippet: buildSnippet(workflow.description ?? workflow.name, term),
    }))
  }
}

export const searchRepository = new SearchRepository()
