import { WorkflowStepType } from '#modules/documents/domain/enums/index'
import { evaluateCondition, evaluateConditions } from '#modules/documents/domain/workflows/condition_evaluator'
import {
  isApprovalNodeType,
  type WorkflowDefinition,
  type WorkflowDocumentContext,
  type WorkflowEdgeDef,
  type WorkflowNodeDef,
} from '#modules/documents/domain/workflows/workflow_types'

export class WorkflowGraph {
  private nodeMap: Map<string, WorkflowNodeDef>
  private outgoingEdges: Map<string, WorkflowEdgeDef[]>

  constructor(private definition: WorkflowDefinition) {
    this.nodeMap = new Map(definition.nodes.map((node) => [node.id, node]))
    this.outgoingEdges = new Map()

    for (const edge of definition.edges) {
      const edges = this.outgoingEdges.get(edge.source) ?? []
      edges.push(edge)
      this.outgoingEdges.set(edge.source, edges)
    }
  }

  getNode(nodeId: string): WorkflowNodeDef | undefined {
    return this.nodeMap.get(nodeId)
  }

  getEntryNodeId(): string {
    return this.definition.entryNodeId
  }

  isEndNode(nodeId: string): boolean {
    return this.getNode(nodeId)?.type === 'end'
  }

  isApprovalNode(nodeId: string): boolean {
    const node = this.getNode(nodeId)
    return node ? isApprovalNodeType(node.type) : false
  }

  getParallelGroupNodeIds(groupId: string): string[] {
    return this.definition.nodes
      .filter((node) => node.parallelGroupId === groupId)
      .map((node) => node.id)
  }

  resolveNextNodeIds(
    completedNodeId: string,
    context: WorkflowDocumentContext,
    activeNodeIds: string[]
  ): string[] {
    const node = this.getNode(completedNodeId)
    if (!node) return []

    if (node.type === WorkflowStepType.PARALLEL && node.parallelGroupId) {
      const groupNodeIds = this.getParallelGroupNodeIds(node.parallelGroupId)
      const completedInGroup = activeNodeIds.filter((id) => groupNodeIds.includes(id))
      if (completedInGroup.length > 0) {
        return []
      }
    }

    const edges = (this.outgoingEdges.get(completedNodeId) ?? []).slice()
    if (edges.length === 0) return []

    if (node.type === WorkflowStepType.CONDITIONAL) {
      const matching = edges
        .filter((edge) => !edge.condition || evaluateCondition(edge.condition, context))
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      return matching.length > 0 ? [matching[0]!.target] : []
    }

    const conditionalEdges = edges.filter((edge) => edge.condition)
    if (conditionalEdges.length > 0) {
      const matching = conditionalEdges
        .filter((edge) => evaluateCondition(edge.condition!, context))
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      if (matching.length > 0) {
        return [matching[0]!.target]
      }
    }

    const defaultEdges = edges.filter((edge) => !edge.condition)
    if (defaultEdges.length > 0) {
      return defaultEdges.map((edge) => edge.target)
    }

    return edges.map((edge) => edge.target)
  }

  expandActivationTargets(nodeIds: string[]): string[] {
    const targets = new Set<string>()

    for (const nodeId of nodeIds) {
      const node = this.getNode(nodeId)
      if (!node) continue

      if (node.type === 'end') continue

      if (node.type === WorkflowStepType.PARALLEL && node.parallelGroupId) {
        for (const groupNodeId of this.getParallelGroupNodeIds(node.parallelGroupId)) {
          targets.add(groupNodeId)
        }
        continue
      }

      if (isApprovalNodeType(node.type)) {
        targets.add(nodeId)
      }
    }

    return [...targets]
  }

  nodeConditionsMet(nodeId: string, context: WorkflowDocumentContext): boolean {
    const node = this.getNode(nodeId)
    if (!node || node.type !== WorkflowStepType.CONDITIONAL) return true
    return evaluateConditions(node.conditions, context)
  }

  toStepRecords() {
    let orderIndex = 0
    const visited = new Set<string>()
    const ordered: WorkflowNodeDef[] = []
    const queue = [this.definition.entryNodeId]

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      if (visited.has(nodeId)) continue
      visited.add(nodeId)

      const node = this.getNode(nodeId)
      if (!node) continue

      if (isApprovalNodeType(node.type)) {
        ordered.push(node)
      }

      for (const edge of this.outgoingEdges.get(nodeId) ?? []) {
        if (!visited.has(edge.target)) {
          queue.push(edge.target)
        }
      }
    }

    return ordered.map((node) => {
      orderIndex += 1
      return {
        nodeId: node.id,
        name: node.name,
        stepType: node.type,
        orderIndex,
        assigneeRoleId: node.assignee?.roleId ?? null,
        assigneeUserId: node.assignee?.userId ?? null,
        assigneeDepartmentId: node.assignee?.departmentId ?? null,
        conditions: node.conditions ?? null,
        slaHours: node.slaHours ?? null,
      }
    })
  }
}

export function buildWorkflowGraph(definition: WorkflowDefinition): WorkflowGraph {
  return new WorkflowGraph(definition)
}
