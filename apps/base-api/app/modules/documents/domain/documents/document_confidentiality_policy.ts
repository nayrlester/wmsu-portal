import type Document from '#modules/documents/models/document'
import type User from '#modules/documents/models/user'
import { DocumentConfidentiality } from '#modules/documents/domain/enums/index'
import { Exception } from '@adonisjs/core/exceptions'

export class ConfidentialityAccessDeniedException extends Exception {
  static status = 403
  static code = 'E_CONFIDENTIALITY_DENIED'

  constructor(message = 'Insufficient clearance for this record') {
    super(message, { status: 403, code: 'E_CONFIDENTIALITY_DENIED' })
  }
}

export class DocumentConfidentialityPolicy {
  static isSensitive(confidentiality: string | null | undefined): boolean {
    return (
      confidentiality === DocumentConfidentiality.CONFIDENTIAL ||
      confidentiality === DocumentConfidentiality.RESTRICTED
    )
  }

  static async assertCanView(document: Document, user: User, tenantId: string): Promise<void> {
    if (!this.isSensitive(document.confidentiality)) {
      return
    }
    if (document.confidentiality === DocumentConfidentiality.RESTRICTED) {
      const allowed = await user.hasPermission('records.restricted.view', tenantId)
      if (!allowed) {
        throw new ConfidentialityAccessDeniedException('Restricted record view requires clearance')
      }
      return
    }
    // confidential: allow creator or restricted.view (reuse clearance for confidential+)
    if (document.createdById === user.id) return
    const allowed = await user.hasPermission('records.restricted.view', tenantId)
    if (!allowed) {
      throw new ConfidentialityAccessDeniedException()
    }
  }

  static async assertCanDownload(document: Document, user: User, tenantId: string): Promise<void> {
    await this.assertCanView(document, user, tenantId)
    if (document.confidentiality !== DocumentConfidentiality.RESTRICTED) {
      return
    }
    const allowed = await user.hasPermission('records.restricted.download', tenantId)
    if (!allowed) {
      throw new ConfidentialityAccessDeniedException('Restricted record download requires clearance')
    }
  }
}
