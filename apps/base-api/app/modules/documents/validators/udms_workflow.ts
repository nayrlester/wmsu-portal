import vine from '@vinejs/vine'
import { ApprovalAction } from '#modules/documents/domain/enums/index'

export const listUdmsQueueValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    officeId: vine.string().uuid().optional(),
    status: vine.string().trim().optional(),
    search: vine.string().trim().minLength(1).maxLength(200).optional(),
  })
)

export const assignUdmsDocumentValidator = vine.compile(
  vine.object({
    toUserId: vine.string().uuid(),
    toOfficeId: vine.string().uuid().optional(),
    remarks: vine.string().trim().maxLength(2000).optional(),
  })
)

export const routeUdmsDocumentValidator = vine.compile(
  vine.object({
    toUserId: vine.string().uuid().optional(),
    toOfficeId: vine.string().uuid().optional(),
    remarks: vine.string().trim().minLength(1).maxLength(2000),
  })
)

export const udmsWorkflowActionValidator = vine.compile(
  vine.object({
    action: vine.enum(Object.values(ApprovalAction)),
    comments: vine.string().trim().maxLength(2000).nullable().optional(),
    stepNodeId: vine.string().trim().maxLength(100).nullable().optional(),
    toUserId: vine.string().uuid().nullable().optional(),
    versionId: vine.string().uuid().nullable().optional(),
  })
)
