import { describe, expect, it } from 'vitest'
import { simulateWorkflow } from '@/lib/workflow-simulate'
import type { WorkflowStepDraft } from '@/lib/workflows'

const steps: WorkflowStepDraft[] = [
  { name: 'Intake', roleId: 'role-a', type: 'sequential', slaHours: 8 },
  {
    name: 'Legal',
    roleId: 'role-b',
    type: 'parallel',
    slaHours: 48,
    parallelGroupId: 'parallel_main',
  },
  {
    name: 'Finance',
    roleId: 'role-c',
    type: 'parallel',
    slaHours: 24,
    parallelGroupId: 'parallel_main',
  },
  {
    name: 'Urgent path',
    roleId: 'role-d',
    type: 'conditional',
    conditionPriority: 'urgent',
    slaHours: 4,
  },
]

describe('simulateWorkflow', () => {
  it('skips conditional steps when priority does not match', () => {
    const result = simulateWorkflow(steps, { priority: 'normal' })
    const urgent = result.trail.find((t) => t.name === 'Urgent path')
    expect(urgent?.status).toBe('skipped')
    expect(result.skippedCount).toBe(1)
    expect(result.activatedCount).toBe(3)
  })

  it('activates conditional steps when priority matches', () => {
    const result = simulateWorkflow(steps, { priority: 'urgent' })
    const urgent = result.trail.find((t) => t.name === 'Urgent path')
    expect(urgent?.status).toBe('activated')
    expect(result.skippedCount).toBe(0)
    expect(result.estimatedSlaHours).toBe(8 + 48 + 4)
  })

  it('uses max SLA across a parallel group', () => {
    const result = simulateWorkflow(steps, { priority: 'normal' })
    expect(result.parallelLaneMaxSla).toBe(48)
    expect(result.estimatedSlaHours).toBe(8 + 48)
  })

  it('returns empty trail when no roles assigned', () => {
    const result = simulateWorkflow([{ name: 'X', roleId: '', type: 'sequential' }], {
      priority: 'high',
    })
    expect(result.trail).toEqual([])
  })
})
