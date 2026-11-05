import env from '#start/env'

export type PlatformDocumentPrefix = 'hris' | 'library' | 'doctrack'

export interface PlatformDocumentDto {
  id: string
  orgId: string
  platformPrefix: PlatformDocumentPrefix
  platformLabel: string
  storageKey: string
  originalName: string
  contentType: string
  sizeBytes: number
  uploadedBy: string
  entityType: string | null
  entityId: string | null
  status: 'active' | 'deleted'
  createdAt: string
  updatedAt: string
}

export interface PlatformDocumentListResult {
  items: PlatformDocumentDto[]
  total: number
  limit: number
  offset: number
}

export interface PlatformDocumentDownloadResult {
  url?: string
  expiresIn?: number
  document?: PlatformDocumentDto
}

function documentsBaseUrl(): string | null {
  const url = env.get('PLATFORM_DOCUMENTS_URL')
  if (!url?.trim()) return null
  return url.replace(/\/$/, '')
}

function serviceApiKey(): string | null {
  const key = env.get('SERVICE_API_KEY')
  return key?.trim() || null
}

/** True when Document Service dual-write / proxy is configured. */
export function isPlatformDocumentsConfigured(): boolean {
  return Boolean(documentsBaseUrl() && serviceApiKey())
}

export class PlatformDocumentClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    const base = documentsBaseUrl()
    const key = serviceApiKey()
    if (!base || !key) {
      throw new Error('PLATFORM_DOCUMENTS_URL and SERVICE_API_KEY are required')
    }
    this.baseUrl = base
    this.apiKey = key
  }

  private headers(orgId: string, userId?: string): Record<string, string> {
    return {
      Accept: 'application/json',
      'X-Service-Api-Key': this.apiKey,
      'X-Platform-Org-Id': orgId,
      'X-Platform-User-Id': userId?.trim() || 'system',
    }
  }

  async upload(input: {
    orgId: string
    userId?: string
    platformPrefix: PlatformDocumentPrefix
    fileName: string
    contentType?: string
    body: Buffer
    entityType?: string | null
    entityId?: string | null
  }): Promise<PlatformDocumentDto> {
    const form = new FormData()
    form.set('platformPrefix', input.platformPrefix)
    if (input.entityType) form.set('entityType', input.entityType)
    if (input.entityId) form.set('entityId', input.entityId)
    form.set(
      'file',
      new Blob([new Uint8Array(input.body)], {
        type: input.contentType || 'application/octet-stream',
      }),
      input.fileName
    )

    const res = await fetch(`${this.baseUrl}/api/v1/documents`, {
      method: 'POST',
      headers: this.headers(input.orgId, input.userId),
      body: form,
    })
    return this.parse(res)
  }

  async list(input: {
    orgId: string
    userId?: string
    platformPrefix?: PlatformDocumentPrefix
    limit?: number
    offset?: number
  }): Promise<PlatformDocumentListResult> {
    const params = new URLSearchParams()
    if (input.platformPrefix) params.set('platformPrefix', input.platformPrefix)
    if (input.limit != null) params.set('limit', String(input.limit))
    if (input.offset != null) params.set('offset', String(input.offset))
    const qs = params.toString()
    const res = await fetch(`${this.baseUrl}/api/v1/documents${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: this.headers(input.orgId, input.userId),
    })
    return this.parse(res)
  }

  async getDownload(input: {
    orgId: string
    id: string
    userId?: string
  }): Promise<{ kind: 'json'; data: PlatformDocumentDownloadResult } | { kind: 'binary'; body: ArrayBuffer; contentType: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/documents/${input.id}/download`, {
      method: 'GET',
      headers: this.headers(input.orgId, input.userId),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error ?? `Document download failed (${res.status})`)
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return { kind: 'json', data: await this.parse(res) }
    }
    return { kind: 'binary', body: await res.arrayBuffer(), contentType }
  }

  private async parse<T>(res: Response): Promise<T> {
    const data = (await res.json().catch(() => ({}))) as { error?: string; data?: T }
    if (!res.ok) {
      throw new Error(data.error ?? `Document request failed (${res.status})`)
    }
    if (data && typeof data === 'object' && 'data' in data && data.data !== undefined) {
      return data.data
    }
    return data as T
  }
}
