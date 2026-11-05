import { DocumentStatus } from '#modules/documents/domain/enums/index'
import { InvalidDocumentStateException } from '#modules/documents/domain/documents/document_exceptions'

const EDITABLE_VERSION_STATUSES = new Set<string>([
  DocumentStatus.DRAFT,
  DocumentStatus.RETURNED,
])

const BRANCH_SOURCE_VERSION_STATUSES = new Set<string>([
  DocumentStatus.DRAFT,
  DocumentStatus.RETURNED,
  DocumentStatus.REJECTED,
])

export class DocumentVersionPolicy {
  static canSubmit(status: string): boolean {
    return EDITABLE_VERSION_STATUSES.has(status)
  }

  static canEditInPlace(status: string): boolean {
    return EDITABLE_VERSION_STATUSES.has(status)
  }

  static canBranchFrom(status: string): boolean {
    return BRANCH_SOURCE_VERSION_STATUSES.has(status)
  }

  static assertCanSubmit(status: string): void {
    if (!this.canSubmit(status)) {
      throw new InvalidDocumentStateException(
        'Only draft or returned versions can be submitted for processing'
      )
    }
  }

  static assertCanEditInPlace(status: string): void {
    if (!this.canEditInPlace(status)) {
      throw new InvalidDocumentStateException('Only draft or returned versions can be edited')
    }
  }

  static assertCanBranchFrom(status: string): void {
    if (!this.canBranchFrom(status)) {
      throw new InvalidDocumentStateException(
        'This version cannot be revised. Create a new draft version first.'
      )
    }
  }
}
