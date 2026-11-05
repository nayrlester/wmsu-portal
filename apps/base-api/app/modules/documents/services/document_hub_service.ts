import { randomUUID } from 'node:crypto'
import env from '#start/env'
import PlatformDocument, {
  type PlatformDocumentPrefix,
} from '#modules/documents/models/platform_document'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'

const PREFIX_LABELS: Record<PlatformDocumentPrefix, string> = {
  hris: 'HRIS Payroll',
  library: 'ULMIS Library',
  doctrack: 'UDMS',
}

const VALID_PREFIXES = new Set<string>(['hris', 'library', 'doctrack'])

export function isValidPlatformPrefix(value: string): value is PlatformDocumentPrefix {
  return VALID_PREFIXES.has(value)
}

export type PlatformDocumentDto = {
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

function toDto(row: PlatformDocument): PlatformDocumentDto {
  return {
    id: row.id,
    orgId: row.orgId,
    platformPrefix: row.platformPrefix,
    platformLabel: row.platformLabel,
    storageKey: row.storageKey,
    originalName: row.originalName,
    contentType: row.contentType,
    sizeBytes: Number(row.sizeBytes),
    uploadedBy: row.uploadedBy,
    entityType: row.entityType,
    entityId: row.entityId,
    status: row.status,
    createdAt: row.createdAt.toISO()!,
    updatedAt: row.updatedAt.toISO()!,
  }
}

/**
 * Canonical enterprise document hub — stores blobs in CDTS storage and
 * metadata in platform_documents for HRIS / Library / DocTrack M2M clients.
 */
export class DocumentHubService {
  private signedUrlExpires = Number(
    env.get('S3_SIGNED_URL_EXPIRES_SECONDS') ?? 900
  )

  async upload(input: {
    orgId: string
    uploadedBy: string
    platformPrefix: PlatformDocumentPrefix
    fileName: string
    contentType: string
    body: Buffer
    entityType?: string | null
    entityId?: string | null
  }): Promise<PlatformDocumentDto> {
    const id = randomUUID()
    const safeName = input.fileName.replace(/[^\w.\- ()]/g, '_').slice(0, 200)
    const storageKey = `platform-hub/${input.orgId}/${input.platformPrefix}/${id}/${safeName}`
    const storage = getStorageAdapter()

    await storage.upload({
      key: storageKey,
      body: input.body,
      contentType: input.contentType || 'application/octet-stream',
      metadata: {
        orgId: input.orgId,
        platformPrefix: input.platformPrefix,
        uploadedBy: input.uploadedBy,
      },
    })

    const row = await PlatformDocument.create({
      id,
      orgId: input.orgId,
      platformPrefix: input.platformPrefix,
      platformLabel: PREFIX_LABELS[input.platformPrefix],
      storageKey,
      originalName: input.fileName,
      contentType: input.contentType || 'application/octet-stream',
      sizeBytes: input.body.byteLength,
      uploadedBy: input.uploadedBy || 'system',
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      status: 'active',
    })

    return toDto(row)
  }

  async list(input: {
    orgId: string
    platformPrefix?: PlatformDocumentPrefix
    limit?: number
    offset?: number
  }): Promise<{ items: PlatformDocumentDto[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
    const offset = Math.max(input.offset ?? 0, 0)

    const base = PlatformDocument.query()
      .where('org_id', input.orgId)
      .where('status', 'active')

    if (input.platformPrefix) {
      base.where('platform_prefix', input.platformPrefix)
    }

    const totalRow = await base.clone().count('* as total')
    const total = Number((totalRow[0] as { $extras: { total: string } }).$extras.total ?? 0)

    const rows = await base.clone().orderBy('created_at', 'desc').offset(offset).limit(limit)

    return {
      items: rows.map(toDto),
      total,
      limit,
      offset,
    }
  }

  async getDownload(input: {
    orgId: string
    id: string
  }): Promise<
    | { kind: 'json'; data: { url: string; expiresIn: number; document: PlatformDocumentDto } }
    | { kind: 'binary'; body: Buffer; contentType: string; document: PlatformDocumentDto }
  > {
    const row = await PlatformDocument.query()
      .where('id', input.id)
      .where('org_id', input.orgId)
      .where('status', 'active')
      .first()

    if (!row) {
      throw new Error('Document not found')
    }

    const dto = toDto(row)
    const storage = getStorageAdapter()

    try {
      const url = await storage.getSignedDownloadUrl(
        row.storageKey,
        this.signedUrlExpires,
        row.originalName,
        'attachment'
      )
      return {
        kind: 'json',
        data: { url, expiresIn: this.signedUrlExpires, document: dto },
      }
    } catch {
      const body = await storage.read(row.storageKey)
      return { kind: 'binary', body, contentType: row.contentType, document: dto }
    }
  }

  /** Local DocTrack upload → hub catalog (no outbound HTTP). */
  async recordDoctrackUpload(input: {
    orgId: string
    uploadedBy: string
    documentId: string
    fileName: string
    contentType: string
    body: Buffer
  }): Promise<PlatformDocumentDto | null> {
    if (!input.orgId) return null
    return this.upload({
      orgId: input.orgId,
      uploadedBy: input.uploadedBy,
      platformPrefix: 'doctrack',
      fileName: input.fileName,
      contentType: input.contentType,
      body: input.body,
      entityType: 'document',
      entityId: input.documentId,
    })
  }
}

export const documentHubService = new DocumentHubService()
