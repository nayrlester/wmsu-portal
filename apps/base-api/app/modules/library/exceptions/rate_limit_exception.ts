export default class RateLimitException extends Error {
  static code = 'RATE_LIMITED'
  status = 429

  constructor(message = 'Too many requests') {
    super(message)
    this.name = 'RateLimitException'
  }
}
