import type { WorkflowStepDraft } from '@/lib/workflows'
import { buildMultiStepWorkflow } from '@/lib/workflows'

export type SimulateContext = {
  priority: string
}

export type SimulateTrailEntry = {
  id: string
  name: string
  type: string
  status: 'activated' | 'skipped' | 'concurrent'
  reason?: string
  slaHours?: number
}

export type SimulateResult = {
  trail: SimulateTrailEntry[]
  activatedCount: number
  skippedCount: number
  estimatedSlaHours: number
  parallelLaneMaxSla: number
}

/**
 * Client-side dry-run of a multi-step workflow definition.
 * Conditional nodes activate only when priority matches; parallel siblings
 * in the same group contribute max(SLA) rather than sum.
 */
export function simulateWorkflow(
  steps: WorkflowStepDraft[],
  context: SimulateContext
): SimulateResult {
  const withRoles = steps.filter((s) => s.roleId)
  if (!withRoles.length) {
    return {
      trail: [],
      activatedCount: 0,
      skippedCount: 0,
      estimatedSlaHours: 0,
      parallelLaneMaxSla: 0,
    }
  }

  const definition = buildMultiStepWorkflow(withRoles)
  const nodes = definition.nodes as Array<{
    id: string
    name?: string
    type?: string
    slaHours?: number
    parallelGroupId?: string
    conditions?: Array<{ field?: string; operator?: string; value?: unknown }>
  }>

  const trail: SimulateTrailEntry[] = [
    { id: 'start', name: 'Start', type: 'start', status: 'activated' },
  ]

  let estimatedSlaHours = 0
  let parallelLaneMaxSla = 0
  let activatedCount = 0
  let skippedCount = 0

  const stepNodes = nodes.filter(
    (n) => n.type === 'sequential' || n.type === 'parallel' || n.type === 'conditional'
  )

  /** Track parallel groups so consecutive parallel nodes share a lane SLA. */
  const seenParallelGroups = new Set<string>()

  for (const node of stepNodes) {
    if (node.type === 'conditional') {
      const expected = node.conditions?.[0]?.value
      const matches =
        typeof expected === 'string' &&
        expected.toLowerCase() === context.priority.toLowerCase()

      if (!matches) {
        skippedCount += 1
        trail.push({
          id: node.id,
          name: node.name ?? node.id,
          type: 'conditional',
          status: 'skipped',
          reason: `Requires priority=${String(expected ?? '?')}; got ${context.priority}`,
          slaHours: node.slaHours,
        })
        continue
      }
    }

    if (node.type === 'parallel' && node.parallelGroupId) {
      const groupId = node.parallelGroupId
      const sla = node.slaHours ?? 0
      if (!seenParallelGroups.has(groupId)) {
        seenParallelGroups.add(groupId)
        parallelLaneMaxSla = sla
      } else {
        parallelLaneMaxSla = Math.max(parallelLaneMaxSla, sla)
      }

      activatedCount += 1
      trail.push({
        id: node.id,
        name: node.name ?? node.id,
        type: 'parallel',
        status: 'concurrent',
        reason: `Parallel group ${groupId}`,
        slaHours: node.slaHours,
      })
      continue
    }

    activatedCount += 1
    const sla = node.slaHours ?? 0
    estimatedSlaHours += sla
    trail.push({
      id: node.id,
      name: node.name ?? node.id,
      type: node.type ?? 'sequential',
      status: 'activated',
      slaHours: node.slaHours,
    })
  }

  // Flush any open parallel lane into the critical path once
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
  }
}
