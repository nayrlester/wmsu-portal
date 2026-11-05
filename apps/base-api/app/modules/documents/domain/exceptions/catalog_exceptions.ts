import { Exception } from '@adonisjs/core/exceptions'

export class CatalogEntityNotFoundException extends Exception {
  static status = 404
  static code = 'E_CATALOG_NOT_FOUND'

  constructor(entity: string, message?: string) {
    super(message ?? `${entity} not found`, { status: 404, code: 'E_CATALOG_NOT_FOUND' })
  }
}

export class CatalogCodeAlreadyExistsException extends Exception {
  static status = 422
  static code = 'E_CATALOG_CODE_EXISTS'

  constructor(message = 'Code is already in use for this organization') {
    super(message, { status: 422, code: 'E_CATALOG_CODE_EXISTS' })
  }
}

export class CatalogEntityInUseException extends Exception {
  static status = 409
  static code = 'E_CATALOG_IN_USE'

  constructor(message: string) {
    super(message, { status: 409, code: 'E_CATALOG_IN_USE' })
  }
}
