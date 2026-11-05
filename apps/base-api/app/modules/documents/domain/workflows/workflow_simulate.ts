import type { WorkflowDefinition, WorkflowDocumentContext } from '#modules/documents/domain/workflows/workflow_types'
import { buildWorkflowGraph } from '#modules/documents/domain/workflows/workflow_graph'

export type WorkflowSimulateInput = {
  priority?: string
  departmentId?: string | null
  documentTypeId?: string | null
  metadata?: Record<string, unknown> | null
}

export type WorkflowSimulateTrailEntry = {
  id: string
  name: string
  type: string
  status: 'activated' | 'skipped' | 'concurrent'
  reason?: string
  slaHours?: number | null
  actions?: Array<{ type: string }>
}

export type WorkflowSimulateResult = {
  trail: WorkflowSimulateTrailEntry[]
  activatedCount: number
  skippedCount: number
  estimatedSlaHours: number
  parallelLaneMaxSla: number
  entryNodeId: string | null
}

/**
 * Server-side dry-run for a published workflow definition.
 * Mirrors client simulate rules: conditional priority match; parallel groups use max SLA.
 */
export function simulateWorkflowDefinition(
  definition: WorkflowDefinition,
  input: WorkflowSimulateInput = {}
): WorkflowSimulateResult {
  const context: WorkflowDocumentContext = {
    priority: input.priority ?? 'medium',
    departmentId: input.departmentId ?? null,
    documentTypeId: input.documentTypeId ?? null,
    metadata: input.metadata ?? null,
  }

  const graph = buildWorkflowGraph(definition)
  const entryNodeId = graph.getEntryNodeId()
  const trail: WorkflowSimulateTrailEntry[] = [
    { id: 'start', name: 'Start', type: 'start', status: 'activated' },
  ]

  let estimatedSlaHours = 0
  let parallelLaneMaxSla = 0
  let activatedCount = 0
  let skippedCount = 0
  const seenParallelGroups = new Set<string>()

  const ordered = [...definition.nodes].filter(
    (n) => n.type === 'sequential' || n.type === 'parallel' || n.type === 'conditional'
  )

  for (const node of ordered) {
    const actions = (node as { actions?: Array<{ type: string }> }).actions

    if (node.type === 'conditional' && !graph.nodeConditionsMet(node.id, context)) {
      skippedCount += 1
      trail.push({
        id: node.id,
        name: node.name,
        type: node.type,
        status: 'skipped',
        reason: 'Conditions not met for simulate context',
        slaHours: node.slaHours ?? null,
        actions,
      })
      continue
    }

    if (node.type === 'parallel' && node.parallelGroupId) {
      const sla = node.slaHours ?? 0
      if (!seenParallelGroups.has(node.parallelGroupId)) {
        seenParallelGroups.add(node.parallelGroupId)
        parallelLaneMaxSla = sla
      } else {
        parallelLaneMaxSla = Math.max(parallelLaneMaxSla, sla)
      }
      activatedCount += 1
      trail.push({
        id: node.id,
        name: node.name,
        type: node.type,
        status: 'concurrent',
        reason: `Parallel group ${node.parallelGroupId}`,
        slaHours: node.slaHours ?? null,
        actions,
      })
      continue
    }

    activatedCount += 1
    estimatedSlaHours += node.slaHours ?? 0
    trail.push({
      id: node.id,
      name: node.name,
      type: node.type,
      status: 'activated',
      slaHours: node.slaHours ?? null,
      actions,
    })
  }

  if (seenParallelGroups.size > 0) {
    estimatedSlaHours += parallelLaneMaxSla
  }

  trail.push({ id: 'end', name: 'End', type: 'end', status: 'activated' })

  return {
    trail,
    activatedCount,
    skippedCount,
    estimatedSlaHours,
    parallelLaneMaxSla,
    entryNodeId,
  }
}
