export default class NotFoundException extends Error {
  static status = 404
  static code = 'NOT_FOUND'
  status = 404
  code = 'NOT_FOUND'

  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundException'
  }
}
