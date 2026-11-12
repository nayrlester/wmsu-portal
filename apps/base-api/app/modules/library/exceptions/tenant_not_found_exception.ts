export default class TenantNotFoundException extends Error {
  static status = 404
  static code = 'TENANT_NOT_FOUND'
  status = 404

  constructor(message = 'Tenant not found or inactive') {
    super(message)
    this.name = 'TenantNotFoundException'
  }
}
