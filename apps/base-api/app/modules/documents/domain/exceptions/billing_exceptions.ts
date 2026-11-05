import { Exception } from '@adonisjs/core/exceptions'

export class BillingNotConfiguredException extends Exception {
  static status = 503
  static code = 'E_BILLING_NOT_CONFIGURED'

  constructor(message = 'Billing provider is not configured') {
    super(message, { status: 503, code: 'E_BILLING_NOT_CONFIGURED' })
  }
}

export class InvalidCouponException extends Exception {
  static status = 422
  static code = 'E_INVALID_COUPON'

  constructor(message = 'Coupon is invalid or expired') {
    super(message, { status: 422, code: 'E_INVALID_COUPON' })
  }
}

export class BillingOperationException extends Exception {
  static status = 422
  static code = 'E_BILLING_OPERATION'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_BILLING_OPERATION' })
  }
}

export class WebhookVerificationException extends Exception {
  static status = 400
  static code = 'E_WEBHOOK_VERIFICATION'

  constructor(message = 'Webhook signature verification failed') {
    super(message, { status: 400, code: 'E_WEBHOOK_VERIFICATION' })
  }
}
