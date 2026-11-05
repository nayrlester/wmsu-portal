export default class BusinessRuleException extends Error {
  static status = 422
  static code = 'BUSINESS_RULE_VIOLATION'
  status = 422
  code = 'BUSINESS_RULE_VIOLATION'

  constructor(message: string) {
    super(message)
    this.name = 'BusinessRuleException'
  }
}
