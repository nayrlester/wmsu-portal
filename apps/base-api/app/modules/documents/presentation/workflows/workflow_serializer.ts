import type Workflow from '#modules/documents/models/workflow'

export class WorkflowSerializer {
  static serialize(workflow: Workflow) {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      version: workflow.version,
      definition: workflow.definition,
      publishedAt: workflow.publishedAt,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      createdBy: workflow.createdBy
        ? {
            id: workflow.createdBy.id,
            fullName: workflow.createdBy.fullName,
            email: workflow.createdBy.email,
          }
        : null,
      steps: workflow.steps?.map((step) => ({
        id: step.id,
        nodeId: step.nodeId,
        name: step.name,
        stepType: step.stepType,
        orderIndex: step.orderIndex,
        assigneeRoleId: step.assigneeRoleId,
        assigneeUserId: step.assigneeUserId,
        assigneeDepartmentId: step.assigneeDepartmentId,
        conditions: step.conditions,
        slaHours: step.slaHours,
      })),
    }
  }

  static serializePaginated(
    result: Awaited<
      ReturnType<
        typeof import('#modules/documents/services/workflow_service').workflowService.list
      >
    >
  ) {
    return {
      meta: result.getMeta(),
      workflows: result.all().map((workflow) => this.serialize(workflow)),
    }
  }
}
