import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'

export type RepositoryResourceType =
  | 'thesis'
  | 'dissertation'
  | 'faculty_publication'
  | 'research_report'
  | 'multimedia'
  | 'conference_paper'
  | 'institutional_document'
  | 'ebook'
  | 'other'

export type EresourceKind =
  | 'ebook'
  | 'ejournal'
  | 'database'
  | 'open_access'
  | 'multimedia'
  | 'other'

export type RepositoryItem = {
  id: string
  title: string
  resourceType: string
  authors?: string | null
  subjects?: string | null
  publicationYear?: number | null
  abstract?: string | null
  accessLevel?: string
  fileUrl?: string | null
  downloadCount?: number
  viewCount?: number
  createdAt?: string
}

export type EresourceItem = {
  id: string
  title: string
  resourceKind: string
  provider?: string | null
  accessUrl?: string | null
  authMethod?: string | null
  viewCount?: number
  isActive?: boolean
}

export type CreateRepositoryPayload = {
  title: string
  resourceType: RepositoryResourceType
  fileUrl?: string
  authors?: string
  subjects?: string
  publicationYear?: number
  abstract?: string
  accessLevel?: string
}

export type CreateEresourcePayload = {
  title: string
  resourceKind?: EresourceKind
  accessUrl?: string
  provider?: string
  authMethod?: string
}

export type UnifiedSearchResult = {
  repository: Array<{
    id: string
    title: string
    type: string
    source: 'repository'
    authors?: string | null
    year?: number | null
    accessLevel?: string
  }>
  electronic: Array<{
    id: string
    title: string
    type: string
    source: 'electronic'
    provider?: string | null
    accessUrl?: string | null
  }>
}

export async function fetchRepository(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<
    ApiResponse<RepositoryItem[]> & {
      meta?: { page: number; perPage: number; total: number; totalPages: number }
    }
  >('/digital/repository', { params })
  return data
}

export async function createRepositoryItem(payload: CreateRepositoryPayload) {
  const { data } = await apiClient.post<ApiResponse<RepositoryItem>>('/digital/repository', payload)
  return data.data
}

export async function accessRepositoryItem(id: string, mode: 'view' | 'download' = 'view') {
  const { data } = await apiClient.post<ApiResponse<RepositoryItem>>(
    `/digital/repository/${id}/access`,
    { mode }
  )
  return data.data
}

export async function fetchEresources() {
  const { data } = await apiClient.get<ApiResponse<EresourceItem[]>>('/digital/eresources')
  return data.data
}

export async function createEresource(payload: CreateEresourcePayload) {
  const { data } = await apiClient.post<ApiResponse<EresourceItem>>('/digital/eresources', {
    resourceKind: 'open_access',
    authMethod: 'sso',
    ...payload,
  })
  return data.data
}

export async function openEresource(id: string) {
  const { data } = await apiClient.post<ApiResponse<EresourceItem>>(`/digital/eresources/${id}/open`)
  return data.data
}

export async function digitalUnifiedSearch(q: string) {
  const { data } = await apiClient.get<ApiResponse<UnifiedSearchResult>>('/digital/search', {
    params: { q },
  })
  const payload = data.data
  return {
    repository: (payload?.repository ?? []).map((item) => ({
      ...item,
      title: item.title || 'Untitled',
      type: item.type || 'item',
      source: 'repository' as const,
    })),
    electronic: (payload?.electronic ?? []).map((item) => {
      const row = item as typeof item & { resourceKind?: string }
      return {
        ...item,
        title: item.title || 'Untitled',
        type: item.type || row.resourceKind || 'resource',
        source: 'electronic' as const,
      }
    }),
  }
}
