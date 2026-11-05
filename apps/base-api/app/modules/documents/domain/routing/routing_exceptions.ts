import { Exception } from '@adonisjs/core/exceptions'

export class RoutingNotAllowedException extends Exception {
  static status = 422
  static code = 'E_ROUTING_NOT_ALLOWED'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_ROUTING_NOT_ALLOWED' })
  }
}

export class InvalidForwardTargetException extends Exception {
  static status = 422
  static code = 'E_INVALID_FORWARD_TARGET'

  constructor(message = 'Forward target user is invalid') {
    super(message, { status: 422, code: 'E_INVALID_FORWARD_TARGET' })
  }
}

export class RejectReasonRequiredException extends Exception {
  static status = 422
  static code = 'E_REJECT_REASON_REQUIRED'

  constructor(message = 'A rejection reason is required') {
    super(message, { status: 422, code: 'E_REJECT_REASON_REQUIRED' })
  }
}

export class EsignRequiredException extends Exception {
  static status = 422
  static code = 'E_ESIGN_REQUIRED'

  constructor(message = 'Complete e-signature before approving this document') {
    super(message, { status: 422, code: 'E_ESIGN_REQUIRED' })
  }
}
