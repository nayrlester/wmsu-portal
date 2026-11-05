import { WorkflowStepType } from '#modules/documents/domain/enums/index'
import { InvalidWorkflowDefinitionException } from '#modules/documents/domain/workflows/workflow_exceptions'
import {
  WORKFLOW_DEFINITION_SCHEMA_VERSION,
  isApprovalNodeType,
  type WorkflowDefinition,
  type WorkflowNodeDef,
} from '#modules/documents/domain/workflows/workflow_types'

function hasAssignee(node: WorkflowNodeDef): boolean {
  if (!node.assignee) return false
  return Boolean(node.assignee.roleId || node.assignee.userId || node.assignee.departmentId)
}

export class WorkflowDefinitionValidator {
  validate(raw: unknown): WorkflowDefinition {
    const errors: string[] = []

    if (!raw || typeof raw !== 'object') {
      throw new InvalidWorkflowDefinitionException('Workflow definition must be an object', [
        'definition is required',
      ])
    }

    const definition = raw as Partial<WorkflowDefinition>

    if (definition.schemaVersion !== WORKFLOW_DEFINITION_SCHEMA_VERSION) {
      errors.push(`schemaVersion must be ${WORKFLOW_DEFINITION_SCHEMA_VERSION}`)
    }

    if (!definition.entryNodeId || typeof definition.entryNodeId !== 'string') {
      errors.push('entryNodeId is required')
    }

    if (!Array.isArray(definition.nodes) || definition.nodes.length === 0) {
      errors.push('nodes must be a non-empty array')
    }

    if (!Array.isArray(definition.edges)) {
      errors.push('edges must be an array')
    }

    if (errors.length > 0) {
      throw new InvalidWorkflowDefinitionException('Invalid workflow definition', errors)
    }

    const nodes = definition.nodes as WorkflowNodeDef[]
    const edges = definition.edges as WorkflowDefinition['edges']
    const nodeIds = new Set<string>()
    const edgeIds = new Set<string>()

    for (const node of nodes) {
      if (!node.id || typeof node.id !== 'string') {
        errors.push('Each node must have an id')
        continue
      }
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`)
      }
      nodeIds.add(node.id)

      if (!node.name || typeof node.name !== 'string') {
        errors.push(`Node ${node.id} must have a name`)
      }

      const validTypes = [...Object.values(WorkflowStepType), 'start', 'end']
      if (!validTypes.includes(node.type)) {
        errors.push(`Node ${node.id} has invalid type: ${node.type}`)
      }

      if (isApprovalNodeType(node.type) && !hasAssignee(node)) {
        errors.push(`Approval node ${node.id} requires roleId, userId, or departmentId assignee`)
      }

      if (node.type === WorkflowStepType.PARALLEL && !node.parallelGroupId) {
        errors.push(`Parallel node ${node.id} requires parallelGroupId`)
      }

      if (node.type === WorkflowStepType.CONDITIONAL && (!node.conditions || node.conditions.length === 0)) {
        errors.push(`Conditional node ${node.id} requires at least one condition rule`)
      }
    }

    for (const edge of edges) {
      if (!edge.id || typeof edge.id !== 'string') {
        errors.push('Each edge must have an id')
        continue
      }
      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge id: ${edge.id}`)
      }
      edgeIds.add(edge.id)

      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references unknown source node: ${edge.source}`)
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references unknown target node: ${edge.target}`)
      }
    }

    if (!nodeIds.has(definition.entryNodeId!)) {
      errors.push(`entryNodeId "${definition.entryNodeId}" does not match any node`)
    }

    const entryNode = nodes.find((node) => node.id === definition.entryNodeId)
    if (entryNode && (entryNode.type === 'start' || entryNode.type === 'end')) {
      errors.push('entryNodeId must reference an approval step, not start/end')
    }

    const startNodes = nodes.filter((node) => node.type === 'start')
    if (startNodes.length > 1) {
      errors.push('Workflow may contain at most one start node')
    }

    const endNodes = nodes.filter((node) => node.type === 'end')
    if (endNodes.length === 0) {
      errors.push('Workflow must contain at least one end node')
    }

    const reachable = this.collectReachableNodes(definition.entryNodeId!, edges)
    for (const node of nodes) {
      if (node.type === 'start' || node.type === 'end') continue
      if (!reachable.has(node.id)) {
        errors.push(`Approval node ${node.id} is not reachable from entryNodeId`)
      }
    }

    const parallelGroups = new Map<string, WorkflowNodeDef[]>()
    for (const node of nodes) {
      if (node.parallelGroupId) {
        const group = parallelGroups.get(node.parallelGroupId) ?? []
        group.push(node)
        parallelGroups.set(node.parallelGroupId, group)
      }
    }

    for (const [groupId, groupNodes] of parallelGroups) {
      if (groupNodes.length < 2) {
        errors.push(`Parallel group ${groupId} must contain at least two nodes`)
      }
      if (groupNodes.some((node) => node.type !== WorkflowStepType.PARALLEL)) {
        errors.push(`Parallel group ${groupId} may only contain parallel step nodes`)
      }
    }

    if (errors.length > 0) {
      throw new InvalidWorkflowDefinitionException('Workflow definition validation failed', errors)
    }

    return definition as WorkflowDefinition
  }

  private collectReachableNodes(entryNodeId: string, edges: WorkflowDefinition['edges']): Set<string> {
    const reachable = new Set<string>([entryNodeId])
    const queue = [entryNodeId]

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const edge of edges) {
        if (edge.source === current && !reachable.has(edge.target)) {
          reachable.add(edge.target)
          queue.push(edge.target)
        }
      }
    }

    return reachable
  }
}

export const workflowDefinitionValidator = new WorkflowDefinitionValidator()
