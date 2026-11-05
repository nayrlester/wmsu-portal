import { Exception } from '@adonisjs/core/exceptions'

export class WorkflowNotFoundException extends Exception {
  static status = 404
  static code = 'E_WORKFLOW_NOT_FOUND'

  constructor(message = 'Workflow not found') {
    super(message, { status: 404, code: 'E_WORKFLOW_NOT_FOUND' })
  }
}

export class InvalidWorkflowDefinitionException extends Exception {
  static status = 422
  static code = 'E_INVALID_WORKFLOW_DEFINITION'

  constructor(
    message: string,
    public readonly errors: string[] = []
  ) {
    super(message, { status: 422, code: 'E_INVALID_WORKFLOW_DEFINITION' })
  }
}

export class InvalidWorkflowStateException extends Exception {
  static status = 422
  static code = 'E_INVALID_WORKFLOW_STATE'

  constructor(message: string) {
    super(message, { status: 422, code: 'E_INVALID_WORKFLOW_STATE' })
  }
}

export class WorkflowInstanceNotFoundException extends Exception {
  static status = 404
  static code = 'E_WORKFLOW_INSTANCE_NOT_FOUND'

  constructor(message = 'Workflow instance not found') {
    super(message, { status: 404, code: 'E_WORKFLOW_INSTANCE_NOT_FOUND' })
  }
}

export class ApprovalNotAllowedException extends Exception {
  static status = 403
  static code = 'E_APPROVAL_NOT_ALLOWED'

  constructor(message: string) {
    super(message, { status: 403, code: 'E_APPROVAL_NOT_ALLOWED' })
  }
}
