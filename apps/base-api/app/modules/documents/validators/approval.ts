import vine from '@vinejs/vine'
import { ApprovalAction } from '#modules/documents/domain/enums/index'

const approvalActionRule = vine.enum(Object.values(ApprovalAction))

export const documentApprovalValidator = vine.compile(
  vine.object({
    action: approvalActionRule,
    comments: vine.string().trim().maxLength(2000).nullable().optional(),
    stepNodeId: vine.string().trim().maxLength(100).nullable().optional(),
    toUserId: vine.string().uuid().nullable().optional(),
    versionId: vine.string().uuid().nullable().optional(),
  })
)

export const activityFeedValidator = vine.compile(
  vine.object({
    limit: vine.number().min(1).max(200).optional(),
  })
)

export const bulkApprovalValidator = vine.compile(
  vine.object({
    documentIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
    action: vine.enum([ApprovalAction.APPROVE, ApprovalAction.REJECT, ApprovalAction.RETURN]),
    comments: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)

