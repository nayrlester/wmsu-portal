export const WORKFLOW_SCHEMA_VERSION = 1

export type WorkflowStepDraft = {
  id?: string
  name: string
  roleId: string
  type: 'sequential' | 'parallel' | 'conditional'
  slaHours?: number
  parallelGroupId?: string
  /** When type is conditional — advance only if document priority matches */
  conditionPriority?: string
  /** Optional BPM side-effect on activation */
  actionType?: 'none' | 'notify' | 'webhook' | 'sms'
  actionMessage?: string
  actionWebhookUrl?: string
}

export function extractReviewRoleId(definition: unknown): string {
  if (!definition || typeof definition !== 'object') return ''
  const nodes = (
    definition as { nodes?: Array<{ id?: string; type?: string; assignee?: { roleId?: string } }> }
  ).nodes
  const review =
    nodes?.find((node) => node.id === 'review') ??
    nodes?.find((node) => node.type === 'sequential')
  return review?.assignee?.roleId ?? ''
}

export function extractWorkflowSteps(definition: unknown): WorkflowStepDraft[] {
  if (!definition || typeof definition !== 'object') return []
  const nodes = (
    definition as {
      nodes?: Array<{
        id?: string
        name?: string
        type?: string
        assignee?: { roleId?: string }
        slaHours?: number
        parallelGroupId?: string
        conditions?: Array<{ field?: string; value?: unknown }>
        actions?: Array<{ type?: string; message?: string; url?: string }>
      }>
    }
  ).nodes
  if (!nodes?.length) return []

  return nodes
    .filter((n) => n.type === 'sequential' || n.type === 'parallel' || n.type === 'conditional')
    .map((n, index) => {
      const action = n.actions?.[0]
      return {
        id: n.id,
        name: n.name ?? `Step ${index + 1}`,
        roleId: n.assignee?.roleId ?? '',
        type: (n.type as WorkflowStepDraft['type']) ?? 'sequential',
        slaHours: n.slaHours,
        parallelGroupId: n.parallelGroupId,
        conditionPriority:
          typeof n.conditions?.[0]?.value === 'string' ? n.conditions[0].value : undefined,
        actionType: (action?.type as WorkflowStepDraft['actionType']) ?? 'none',
        actionMessage: action?.message,
        actionWebhookUrl: action?.url,
      }
    })
}

export function buildSimpleWorkflow(roleId: string) {
  return buildMultiStepWorkflow([
    { name: 'Review', roleId, type: 'sequential', slaHours: 24 },
  ])
}

export function buildMultiStepWorkflow(steps: WorkflowStepDraft[]) {
  const cleaned = steps.filter((s) => s.roleId)
  if (!cleaned.length) {
    throw new Error('At least one workflow step with a role is required')
  }

  const nodes: Array<Record<string, unknown>> = [
    { id: 'start', name: 'Start', type: 'start', position: { x: 0, y: 0 } },
  ]
  const edges: Array<Record<string, unknown>> = []

  cleaned.forEach((step, index) => {
    const id = step.id ?? (index === 0 ? 'review' : `step_${index + 1}`)
    const node: Record<string, unknown> = {
      id,
      name: step.name || `Step ${index + 1}`,
      type: step.type,
      assignee: { roleId: step.roleId },
      position: { x: 120 * (index + 1), y: step.type === 'parallel' ? 40 : 0 },
    }
    if (step.slaHours && step.slaHours > 0) node.slaHours = step.slaHours
    if (step.type === 'parallel') {
      node.parallelGroupId = step.parallelGroupId ?? 'parallel_main'
    }
    if (step.type === 'conditional' && step.conditionPriority) {
      node.conditions = [
        { field: 'priority', operator: 'eq', value: step.conditionPriority },
      ]
    }
    if (step.actionType && step.actionType !== 'none') {
      if (step.actionType === 'notify') {
        node.actions = [{ type: 'notify', channel: 'email', message: step.actionMessage }]
      } else if (step.actionType === 'webhook' && step.actionWebhookUrl) {
        node.actions = [{ type: 'webhook', url: step.actionWebhookUrl }]
      } else if (step.actionType === 'sms') {
        node.actions = [{ type: 'sms', message: step.actionMessage }]
      }
    }
    nodes.push(node)

    const prevId = index === 0 ? 'start' : String(nodes[index].id)
    edges.push({
      id: `e-${prevId}-${id}`,
      source: prevId,
      target: id,
    })
  })

  nodes.push({
    id: 'end',
    name: 'End',
    type: 'end',
    position: { x: 120 * (cleaned.length + 1), y: 0 },
  })
  const lastStepId = String(nodes[nodes.length - 2].id)
  edges.push({ id: `e-${lastStepId}-end`, source: lastStepId, target: 'end' })

  return {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    entryNodeId: String(nodes[1].id),
    nodes,
    edges,
  }
}
