import { Exception } from '@adonisjs/core/exceptions'

export class PlanLimitExceededException extends Exception {
  static status = 403
  static code = 'E_PLAN_LIMIT_EXCEEDED'

  constructor(
    public limitType: 'users' | 'documents' | 'storage' | 'feature',
    message?: string
  ) {
    super(message ?? `Plan limit exceeded for ${limitType}`, { status: 403, code: 'E_PLAN_LIMIT_EXCEEDED' })
  }
}

export class TenantAccessDeniedException extends Exception {
  static status = 403
  static code = 'E_TENANT_ACCESS_DENIED'

  constructor(message = 'Tenant access denied') {
    super(message, { status: 403, code: 'E_TENANT_ACCESS_DENIED' })
  }
}

export class TenantNotFoundException extends Exception {
  static status = 404
  static code = 'E_TENANT_NOT_FOUND'

  constructor(message = 'Organization not found') {
    super(message, { status: 404, code: 'E_TENANT_NOT_FOUND' })
  }
}

export class TenantContextMissingException extends Exception {
  static status = 403
  static code = 'E_TENANT_CONTEXT_MISSING'

  constructor(
    message = 'Tenant context is required. Sign in with an organization account or provide X-Tenant-Id.'
  ) {
    super(message, { status: 403, code: 'E_TENANT_CONTEXT_MISSING' })
  }
}
