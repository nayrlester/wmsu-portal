import { Exception } from '@adonisjs/core/exceptions'

export class SystemRoleProtectedException extends Exception {
  static status = 422
  static code = 'E_SYSTEM_ROLE_PROTECTED'

  constructor(message = 'This system role cannot be changed that way') {
    super(message, { status: 422, code: 'E_SYSTEM_ROLE_PROTECTED' })
  }
}

export class RoleInUseException extends Exception {
  static status = 422
  static code = 'E_ROLE_IN_USE'

  constructor(message = 'This role is assigned to users and cannot be deleted') {
    super(message, { status: 422, code: 'E_ROLE_IN_USE' })
  }
}
