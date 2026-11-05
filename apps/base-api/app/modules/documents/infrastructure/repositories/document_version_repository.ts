import DocumentVersion from '#modules/documents/models/document_version'
import { DocumentAccessPolicy } from '#modules/documents/domain/documents/document_access_policy'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import {
  formatVersionLabel,
  INITIAL_DRAFT_VERSION,
  resolveBaselinePromotion,
  resolveNextMajorVersion,
  resolveNextRevisionVersion,
  toVersionParts,
  type DocumentVersionParts,
} from '#modules/documents/domain/documents/document_version_label'
import { DocumentStatus } from '#modules/documents/domain/enums/index'

export class DocumentVersionRepository {
  async listByDocument(
    documentId: string,
    page = 1,
    limit = 25,
    visibility?: { viewerUserId: string; documentCreatedById: string }
  ) {
    const tenantId = tenantContext.requireTenantId()
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const query = DocumentVersion.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNull('deleted_at')

    if (visibility) {
      DocumentAccessPolicy.applyDraftVersionVisibilityToQuery(
        query,
        { status: DocumentStatus.DRAFT, createdById: visibility.documentCreatedById },
        visibility.viewerUserId
      )
    }

    return query
      .preload('createdBy')
      .orderBy('version_number', 'desc')
      .orderBy('version_minor', 'desc')
      .paginate(page, safeLimit)
  }

  async listAllByDocument(
    documentId: string,
    visibility?: { viewerUserId: string; documentCreatedById: string }
  ): Promise<DocumentVersion[]> {
    const tenantId = tenantContext.requireTenantId()
    const query = DocumentVersion.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNull('deleted_at')

    if (visibility) {
      DocumentAccessPolicy.applyDraftVersionVisibilityToQuery(
        query,
        { status: DocumentStatus.DRAFT, createdById: visibility.documentCreatedById },
        visibility.viewerUserId
      )
    }

    return query.preload('createdBy').orderBy('version_number', 'asc').orderBy('version_minor', 'asc')
  }

  async findById(documentId: string, versionId: string): Promise<DocumentVersion | null> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentVersion.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .where('id', versionId)
      .whereNull('deleted_at')
      .first()
  }

  async getLatest(documentId: string): Promise<DocumentVersion | null> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentVersion.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNull('deleted_at')
      .orderBy('version_number', 'desc')
      .orderBy('version_minor', 'desc')
      .first()
  }

  async hasApprovedBaseline(documentId: string): Promise<boolean> {
    const baseline = await this.getLatestApprovedBaseline(documentId)
    return baseline !== null
  }

  async getLatestApprovedBaseline(documentId: string): Promise<DocumentVersion | null> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentVersion.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNull('deleted_at')
      .where('status', DocumentStatus.APPROVED)
      .where('version_number', '>=', 1)
      .orderBy('version_number', 'desc')
      .orderBy('version_minor', 'desc')
      .first()
  }

  async promoteApprovedBaseline(documentId: string, versionId: string): Promise<void> {
    const hasBaseline = await this.hasApprovedBaseline(documentId)
    if (hasBaseline) return

    const version = await this.findById(documentId, versionId)
    if (!version) return

    const promoted = resolveBaselinePromotion(toVersionParts(version), hasBaseline)
    if (!promoted) return

    version.versionNumber = promoted.major
    version.versionMinor = promoted.minor
    await version.save()
  }

  async getNextMajorVersion(documentId: string): Promise<DocumentVersionParts> {
    const latest = await this.getLatest(documentId)
    const hasBaseline = await this.hasApprovedBaseline(documentId)
    return resolveNextMajorVersion(latest ? toVersionParts(latest) : null, hasBaseline)
  }

  async getNextRevisionVersion(
    documentId: string,
    sourceVersion: Pick<DocumentVersion, 'versionNumber' | 'versionMinor'>
  ): Promise<DocumentVersionParts> {
    const latest = await this.getLatest(documentId)
    const hasBaseline = await this.hasApprovedBaseline(documentId)
    return resolveNextRevisionVersion(
      toVersionParts(sourceVersion),
      latest ? toVersionParts(latest) : null,
      hasBaseline
    )
  }

  formatLabel(version: Pick<DocumentVersion, 'versionNumber' | 'versionMinor'>): string {
    return formatVersionLabel(version.versionNumber, version.versionMinor ?? 0)
  }

  async create(data: {
    tenantId: string
    documentId: string
    versionNumber: number
    versionMinor?: number
    changeNotes: string | null
    createdById: string
    contentHtml?: string | null
    sourceType?: string
    status?: string
  }): Promise<DocumentVersion> {
    return DocumentVersion.create({
      ...data,
      versionMinor: data.versionMinor ?? 0,
      status: data.status ?? 'draft',
    })
  }
}

export const documentVersionRepository = new DocumentVersionRepository()
