export default class ForbiddenException extends Error {
  static status = 403
  static code = 'FORBIDDEN'
  status = 403
  code = 'FORBIDDEN'

  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenException'
  }
}
