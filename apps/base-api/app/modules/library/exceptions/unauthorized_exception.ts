export default class UnauthorizedException extends Error {
  static status = 401
  static code = 'UNAUTHORIZED'
  status = 401
  code = 'UNAUTHORIZED'

  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedException'
  }
}
