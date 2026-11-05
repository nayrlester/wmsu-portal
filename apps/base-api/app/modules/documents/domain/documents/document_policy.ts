import { DocumentStatus } from '#modules/documents/domain/enums/index'
import { InvalidDocumentStateException } from '#modules/documents/domain/documents/document_exceptions'

const EDITABLE_STATUSES = new Set<string>([DocumentStatus.DRAFT, DocumentStatus.RETURNED])
const CONTENT_MODIFIABLE_STATUSES = new Set<string>([
  DocumentStatus.DRAFT,
  DocumentStatus.RETURNED,
  DocumentStatus.REJECTED,
])
const DELETABLE_STATUSES = new Set<string>([DocumentStatus.DRAFT])
const ARCHIVABLE_STATUSES = new Set<string>([
  DocumentStatus.APPROVED,
  DocumentStatus.REJECTED,
  DocumentStatus.COMPLETED,
  DocumentStatus.RETURNED,
])
const SUBMITTABLE_STATUSES = new Set<string>([DocumentStatus.DRAFT, DocumentStatus.RETURNED])
const VERSION_CONTENT_BLOCKED_DOCUMENT_STATUSES = new Set<string>([
  DocumentStatus.ARCHIVED,
  DocumentStatus.COMPLETED,
])

export class DocumentPolicy {
  static canUpdate(status: string): boolean {
    return EDITABLE_STATUSES.has(status)
  }

  static canDelete(status: string): boolean {
    return DELETABLE_STATUSES.has(status)
  }

  static canArchive(status: string): boolean {
    return ARCHIVABLE_STATUSES.has(status) && status !== DocumentStatus.ARCHIVED
  }

  static canSubmit(status: string): boolean {
    return SUBMITTABLE_STATUSES.has(status)
  }

  static canModifyContent(status: string): boolean {
    return CONTENT_MODIFIABLE_STATUSES.has(status)
  }

  static assertCanUpdate(status: string): void {
    if (!this.canUpdate(status)) {
      throw new InvalidDocumentStateException('Only draft or returned documents can be updated')
    }
  }

  static assertCanModifyContent(status: string): void {
    if (!this.canModifyContent(status)) {
      throw new InvalidDocumentStateException(
        'This document cannot be modified in its current state'
      )
    }
  }

  static assertCanCreateVersion(status: string): void {
    this.assertCanModifyVersionContent(status)
  }

  static canModifyVersionContent(status: string): boolean {
    return !VERSION_CONTENT_BLOCKED_DOCUMENT_STATUSES.has(status)
  }

  static assertCanModifyVersionContent(status: string): void {
    if (!this.canModifyVersionContent(status)) {
      throw new InvalidDocumentStateException(
        'This document cannot be modified in its current state'
      )
    }
  }

  static assertCanDelete(status: string): void {
    if (!this.canDelete(status)) {
      throw new InvalidDocumentStateException('Only draft documents can be deleted')
    }
  }

  static assertCanArchive(status: string): void {
    if (!this.canArchive(status)) {
      throw new InvalidDocumentStateException(
        'Only approved, rejected, completed, or returned documents can be archived'
      )
    }
  }

  static assertCanSubmit(status: string): void {
    if (!this.canSubmit(status)) {
      throw new InvalidDocumentStateException('Only draft or returned documents can be submitted')
    }
  }
}
