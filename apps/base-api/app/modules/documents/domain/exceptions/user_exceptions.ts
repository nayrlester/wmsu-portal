import { Exception } from '@adonisjs/core/exceptions'

export class UserNotFoundException extends Exception {
  static status = 404
  static code = 'USER_NOT_FOUND'

  constructor(message = 'User not found') {
    super(message, { status: 404, code: 'USER_NOT_FOUND' })
  }
}

export class UserOperationForbiddenException extends Exception {
  static status = 403
  static code = 'USER_OPERATION_FORBIDDEN'

  constructor(message = 'This user operation is not allowed') {
    super(message, { status: 403, code: 'USER_OPERATION_FORBIDDEN' })
  }
}

export class UserAlreadyExistsException extends Exception {
  static status = 409
  static code = 'USER_ALREADY_EXISTS'

  constructor(message = 'A user with this email already exists') {
    super(message, { status: 409, code: 'USER_ALREADY_EXISTS' })
  }
}
