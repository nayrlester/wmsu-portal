import { Exception } from '@adonisjs/core/exceptions'

export class FileNotFoundException extends Exception {
  static status = 404
  static code = 'E_FILE_NOT_FOUND'

  constructor(message = 'File not found') {
    super(message, { status: 404, code: 'E_FILE_NOT_FOUND' })
  }
}

export class InvalidFileTypeException extends Exception {
  static status = 422
  static code = 'E_INVALID_FILE_TYPE'

  constructor(message = 'File type is not allowed') {
    super(message, { status: 422, code: 'E_INVALID_FILE_TYPE' })
  }
}

export class FileTooLargeException extends Exception {
  static status = 413
  static code = 'E_FILE_TOO_LARGE'

  constructor(message = 'File exceeds maximum allowed size') {
    super(message, { status: 413, code: 'E_FILE_TOO_LARGE' })
  }
}

export class VirusDetectedException extends Exception {
  static status = 422
  static code = 'E_VIRUS_DETECTED'

  constructor(message = 'File failed virus scan') {
    super(message, { status: 422, code: 'E_VIRUS_DETECTED' })
  }
}

export class FileUploadNotAllowedException extends Exception {
  static status = 422
  static code = 'E_FILE_UPLOAD_NOT_ALLOWED'

  constructor(message = 'Files cannot be uploaded for this document state') {
    super(message, { status: 422, code: 'E_FILE_UPLOAD_NOT_ALLOWED' })
  }
}
