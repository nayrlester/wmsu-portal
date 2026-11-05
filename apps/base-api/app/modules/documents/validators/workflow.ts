import vine from '@vinejs/vine'
import { WorkflowStatus } from '#modules/documents/domain/enums/index'

const workflowStatusRule = vine.enum(Object.values(WorkflowStatus))

export const createWorkflowValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().nullable().optional(),
    definition: vine.any(),
  })
)

export const updateWorkflowValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().nullable().optional(),
    definition: vine.any().optional(),
  })
)

export const listWorkflowsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    status: workflowStatusRule.optional(),
    search: vine.string().trim().minLength(1).maxLength(200).optional(),
  })
)

export const assignWorkflowValidator = vine.compile(
  vine.object({
    workflowId: vine.string().uuid(),
  })
)
