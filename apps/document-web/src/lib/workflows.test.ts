import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_SCHEMA_VERSION,
  buildMultiStepWorkflow,
  buildSimpleWorkflow,
  extractReviewRoleId,
  extractWorkflowSteps,
} from '@/lib/workflows'

describe('buildSimpleWorkflow', () => {
  it('creates a valid three-step workflow graph', () => {
    const roleId = '11111111-1111-1111-1111-111111111111'
    const workflow = buildSimpleWorkflow(roleId)

    expect(workflow.schemaVersion).toBe(WORKFLOW_SCHEMA_VERSION)
    expect(workflow.entryNodeId).toBe('review')
    expect(workflow.nodes).toHaveLength(3)
    expect(workflow.edges).toHaveLength(2)

    const review = workflow.nodes.find((n) => n.id === 'review')
    expect(review?.type).toBe('sequential')
    expect(review?.assignee).toEqual({ roleId })
  })

  it('connects start → review → end', () => {
    const workflow = buildSimpleWorkflow('role-1')
    expect(workflow.edges[0]).toMatchObject({ source: 'start', target: 'review' })
    expect(workflow.edges[1]).toMatchObject({ source: 'review', target: 'end' })
  })
})

describe('buildMultiStepWorkflow', () => {
  it('supports parallel and conditional steps with SLA', () => {
    const workflow = buildMultiStepWorkflow([
      { name: 'Intake', roleId: 'role-a', type: 'sequential', slaHours: 8 },
      {
        name: 'Legal + Finance',
        roleId: 'role-b',
        type: 'parallel',
        slaHours: 48,
        parallelGroupId: 'parallel_main',
      },
      {
        name: 'Urgent path',
        roleId: 'role-c',
        type: 'conditional',
        conditionPriority: 'urgent',
        slaHours: 4,
      },
    ])

    expect(workflow.nodes).toHaveLength(5)
    expect(workflow.edges).toHaveLength(4)
    const parallel = workflow.nodes.find((n) => n.type === 'parallel')
    expect(parallel?.parallelGroupId).toBe('parallel_main')
    expect(parallel?.slaHours).toBe(48)
    const conditional = workflow.nodes.find((n) => n.type === 'conditional')
    expect(conditional?.conditions).toEqual([
      { field: 'priority', operator: 'eq', value: 'urgent' },
    ])
  })
})

describe('extractReviewRoleId', () => {
  it('reads roleId from the review node', () => {
    const roleId = 'abc-123'
    expect(extractReviewRoleId(buildSimpleWorkflow(roleId))).toBe(roleId)
  })

  it('returns empty string for invalid definitions', () => {
    expect(extractReviewRoleId(null)).toBe('')
    expect(extractReviewRoleId({})).toBe('')
  })
})

describe('extractWorkflowSteps', () => {
  it('round-trips multi-step drafts', () => {
    const definition = buildMultiStepWorkflow([
      { name: 'A', roleId: 'r1', type: 'sequential', slaHours: 12 },
      { name: 'B', roleId: 'r2', type: 'parallel', parallelGroupId: 'parallel_main' },
    ])
    const steps = extractWorkflowSteps(definition)
    expect(steps).toHaveLength(2)
    expect(steps[0]).toMatchObject({ name: 'A', roleId: 'r1', slaHours: 12 })
    expect(steps[1]).toMatchObject({ name: 'B', type: 'parallel' })
  })
})
