import { DocumentStatus } from '#modules/documents/domain/enums/index'
import { DocumentNotFoundException } from '#modules/documents/domain/documents/document_exceptions'

export interface DocumentAccessContext {
  status: string
  createdById: string
  /** Set when the record is on a digitization / OCR-QA board. */
  ocrQaStatus?: string | null
  /** Set when physical box linkage has been recorded (records intake). */
  physicalBoxId?: string | null
}

export interface DocumentVersionAccessContext {
  status: string
  /** When set, draft versions are visible to their creator as well as the document owner. */
  createdById?: string | null
}

export class DocumentAccessPolicy {
  /**
   * Drafts are creator-private until they enter records intake
   * (digitization OCR/QA or physical box linkage), when desk staff must open the linked file.
   */
  static canView(document: DocumentAccessContext, userId: string): boolean {
    if (document.status === DocumentStatus.DRAFT) {
      if (String(document.createdById) === String(userId)) return true
      return Boolean(document.ocrQaStatus || document.physicalBoxId)
    }
    return true
  }

  static canViewVersion(
    version: DocumentVersionAccessContext,
    document: DocumentAccessContext,
    userId: string
  ): boolean {
    if (version.status === DocumentStatus.DRAFT) {
      if (String(document.createdById) === String(userId)) return true
      if (version.createdById && String(version.createdById) === String(userId)) return true
      return false
    }
    return true
  }

  static applyDraftVersionVisibilityToQuery(
    query: {
      where: (callback: (builder: {
        whereNot: (column: string, value: string) => unknown
        orWhere: (column: string, value: string) => unknown
      }) => void) => unknown
    },
    document: DocumentAccessContext,
    viewerUserId: string
  ): void {
    if (String(document.createdById) === String(viewerUserId)) return

    // Non-owners see non-draft versions plus any draft they personally created (e.g. revision upload).
    query.where((builder) => {
      builder.whereNot('status', DocumentStatus.DRAFT).orWhere('created_by_id', viewerUserId)
    })
  }

  static assertCanView(document: DocumentAccessContext, userId: string): void {
    if (!this.canView(document, userId)) {
      throw new DocumentNotFoundException()
    }
  }

  static assertCanViewVersion(
    version: DocumentVersionAccessContext,
    document: DocumentAccessContext,
    userId: string
  ): void {
    if (!this.canViewVersion(version, document, userId)) {
      throw new DocumentNotFoundException()
    }
  }

  static assertCanModify(document: DocumentAccessContext, userId: string): void {
    this.assertCanView(document, userId)
  }

  static applyVersionVisibility<
    TVersion extends DocumentVersionAccessContext & { id: string },
    TFile extends { versionId: string },
  >(
    document: DocumentAccessContext & {
      versions?: TVersion[]
      files?: TFile[]
    },
    userId: string
  ): void {
    if (document.versions?.length) {
      document.versions = document.versions.filter((version) =>
        this.canViewVersion(version, document, userId)
      )
    }

    if (!document.files?.length) return

    if (!document.versions?.length) {
      document.files = []
      return
    }

    const visibleVersionIds = new Set(document.versions.map((version) => version.id))
    document.files = document.files.filter((file) => visibleVersionIds.has(file.versionId))
  }
}
