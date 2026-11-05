import type { WorkflowStepType } from '#modules/documents/domain/enums/index'

export const WORKFLOW_DEFINITION_SCHEMA_VERSION = 1 as const

export type WorkflowNodeKind = WorkflowStepType | 'start' | 'end'

export interface WorkflowNodePosition {
  x: number
  y: number
}

export interface WorkflowAssignee {
  roleId?: string
  userId?: string
  departmentId?: string
}

export interface WorkflowConditionRule {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
  value: unknown
}

export interface WorkflowNodeDef {
  id: string
  name: string
  type: WorkflowNodeKind
  position?: WorkflowNodePosition
  assignee?: WorkflowAssignee
  slaHours?: number
  parallelGroupId?: string
  conditions?: WorkflowConditionRule[]
  targetDocumentStatus?: string
  /** Side-effects when the step activates: notify, webhook, sms (stub). */
  actions?: Array<
    | { type: 'notify'; channel?: 'in_app' | 'email'; message?: string }
    | { type: 'webhook'; url: string; method?: 'POST' | 'PUT'; headers?: Record<string, string> }
    | { type: 'sms'; message?: string }
  >
}

export interface WorkflowEdgeDef {
  id: string
  source: string
  target: string
  label?: string
  condition?: WorkflowConditionRule
  priority?: number
}

export interface WorkflowDefinition {
  schemaVersion: typeof WORKFLOW_DEFINITION_SCHEMA_VERSION
  entryNodeId: string
  nodes: WorkflowNodeDef[]
  edges: WorkflowEdgeDef[]
}

export interface WorkflowParallelGroupState {
  nodeIds: string[]
  completedNodeIds: string[]
}

export interface WorkflowInstanceState {
  activeNodeIds: string[]
  completedNodeIds: string[]
  parallelGroups: Record<string, WorkflowParallelGroupState>
  history: Array<{
    nodeId: string
    action: string
    userId: string
    at: string
  }>
}

export interface WorkflowDocumentContext {
  priority: string
  departmentId: string | null
  documentTypeId: string | null
  metadata: Record<string, unknown> | null
}

export function createInitialInstanceState(entryNodeId: string): WorkflowInstanceState {
  return {
    activeNodeIds: [entryNodeId],
    completedNodeIds: [],
    parallelGroups: {},
    history: [],
  }
}

export function isApprovalNodeType(type: WorkflowNodeKind): type is WorkflowStepType {
  return type === 'sequential' || type === 'parallel' || type === 'conditional'
}
