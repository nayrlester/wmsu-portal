import { WorkflowStatus } from '#modules/documents/domain/enums/index'
import { InvalidWorkflowStateException } from '#modules/documents/domain/workflows/workflow_exceptions'

export class WorkflowPolicy {
  static canUpdate(status: string): boolean {
    return status === WorkflowStatus.DRAFT
  }

  static canDelete(status: string): boolean {
    return status === WorkflowStatus.DRAFT
  }

  static canPublish(status: string): boolean {
    return status === WorkflowStatus.DRAFT
  }

  static assertCanUpdate(status: string): void {
    if (!this.canUpdate(status)) {
      throw new InvalidWorkflowStateException('Only draft workflows can be edited')
    }
  }

  static assertCanDelete(status: string): void {
    if (!this.canDelete(status)) {
      throw new InvalidWorkflowStateException('Only draft workflows can be deleted')
    }
  }

  static assertCanPublish(status: string): void {
    if (!this.canPublish(status)) {
      throw new InvalidWorkflowStateException('Only draft workflows can be published')
    }
  }
}
