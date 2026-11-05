import { Exception } from '@adonisjs/core/exceptions'

export class DocumentNotFoundException extends Exception {
  static status = 404
  static code = 'E_DOCUMENT_NOT_FOUND'

  constructor(message = 'Document not found') {
    super(message, { status: 404, code: 'E_DOCUMENT_NOT_FOUND' })
  }
}

export class InvalidDocumentStateException extends Exception {
  static status = 422
  static code = 'E_INVALID_DOCUMENT_STATE'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_INVALID_DOCUMENT_STATE' })
  }
}

export class DocumentReferenceNotFoundException extends Exception {
  static status = 422
  static code = 'E_DOCUMENT_REFERENCE_NOT_FOUND'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_DOCUMENT_REFERENCE_NOT_FOUND' })
  }
}
