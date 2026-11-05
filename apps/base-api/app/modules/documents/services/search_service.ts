import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { resolveMimeType } from '#modules/documents/domain/files/file_constants'
import type {
  ImageSearchResult,
  SearchFilters,
  SearchResultType,
  UniversalSearchResult,
} from '#modules/documents/domain/search/search_types'
import { getOcrProvider } from '#infrastructure/intelligence/provider_registry'
import { searchRepository } from '#infrastructure/repositories/search_repository'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { hashSearchQuery } from '#modules/documents/domain/documents/document_search'
import { cacheService } from '#infrastructure/cache/redis_cache_service'
import { searchDocumentsWithFallback } from '#infrastructure/search/meilisearch_service'
import env from '#start/env'

export interface SearchPermissionContext {
  canViewDocuments: boolean
  canViewUsers: boolean
  canViewWorkflows: boolean
  viewerUserId?: string
}

const DEFAULT_LIMIT = 8
const ALL_TYPES: SearchResultType[] = ['document', 'file', 'user', 'workflow']

export class SearchService {
  async search(filters: SearchFilters, permissions: SearchPermissionContext): Promise<UniversalSearchResult> {
    const term = filters.q.trim()
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, 50)
    const requestedTypes = filters.types?.length ? filters.types : ALL_TYPES

    const types = requestedTypes.filter((type) => {
      if (type === 'document' || type === 'file') return permissions.canViewDocuments
      if (type === 'user') return permissions.canViewUsers
      if (type === 'workflow') return permissions.canViewWorkflows
      return false
    })

    const includeDocuments = types.includes('document')
    const includeFiles = types.includes('file')
    const includeUsers = types.includes('user')
    const includeWorkflows = types.includes('workflow')
    const tenantId = tenantContext.requireTenantId()
    const viewerUserId = permissions.viewerUserId
    const cacheKey = `cache:search:${tenantId}:${viewerUserId ?? 'all'}:${hashSearchQuery(term)}:${limit}:${types.join(',')}:ocr${filters.minOcrConfidence ?? 'any'}`
    const cacheTtl = env.get('CACHE_TTL_SEARCH_SECONDS') ?? 180

    const cached = await cacheService.get<UniversalSearchResult>(cacheKey)
    if (cached) return cached

    const [documents, files, users, workflows] = await Promise.all([
      includeDocuments
        ? searchDocumentsWithFallback(tenantId, term, limit, viewerUserId)
        : Promise.resolve([]),
      includeFiles
        ? searchRepository.searchFiles(term, limit, viewerUserId, filters.minOcrConfidence)
        : Promise.resolve([]),
      includeUsers ? searchRepository.searchUsers(term, limit) : Promise.resolve([]),
      includeWorkflows ? searchRepository.searchWorkflows(term, limit) : Promise.resolve([]),
    ])

    const result = {
      query: term,
      documents,
      files,
      users,
      workflows,
      meta: {
        total: documents.length + files.length + users.length + workflows.length,
        documents: documents.length,
        files: files.length,
        users: users.length,
        workflows: workflows.length,
      },
    }

    await cacheService.set(cacheKey, result, cacheTtl)
    return result
  }

  async searchByImage(
    uploadFile: MultipartFile,
    permissions: SearchPermissionContext,
    limit?: number
  ): Promise<ImageSearchResult> {
    tenantContext.requireTenantId()

    const extension = uploadFile.extname ?? ''
    const mimeType = resolveMimeType(uploadFile.type, extension)

    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new Error('Only PNG and JPEG images are supported for image search')
    }

    if (!uploadFile.isValid) {
      throw new Error(uploadFile.errors[0]?.message ?? 'Invalid image upload')
    }

    const buffer = await uploadFile.tmpPath
      ? await import('node:fs/promises').then((fs) => fs.readFile(uploadFile.tmpPath!))
      : Buffer.alloc(0)

    const ocrProvider = getOcrProvider()
    const ocrResult = await ocrProvider.extractText({
      bucket: 'search-upload',
      key: uploadFile.clientName,
      mimeType,
      fileBuffer: buffer,
    })

    const extractedText = ocrResult.text.trim()
    if (!extractedText) {
      return {
        query: '',
        extractedText: '',
        ocrProvider: ocrProvider.name,
        documents: [],
        files: [],
        users: [],
        workflows: [],
        meta: { total: 0, documents: 0, files: 0, users: 0, workflows: 0 },
      }
    }

    const searchTerms = this.pickSearchTerms(extractedText)
    const query = searchTerms.join(' ')

    const results = await this.search(
      {
        q: query,
        limit,
        types: ['document', 'file'],
      },
      { ...permissions, viewerUserId: permissions.viewerUserId }
    )

    return {
      ...results,
      query,
      extractedText,
      ocrProvider: ocrProvider.name,
    }
  }

  private pickSearchTerms(text: string): string[] {
    const words = text
      .split(/\s+/)
      .map((word) => word.replace(/[^\w.-]/g, ''))
      .filter((word) => word.length >= 3)

    const unique = [...new Set(words)]
    return unique.slice(0, 8)
  }
}

export const searchService = new SearchService()
