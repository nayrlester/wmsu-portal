import vine from '@vinejs/vine'
import { RecordAccessMode } from '#modules/documents/domain/enums/index'

const accessModeRule = vine.enum(Object.values(RecordAccessMode))

export const createRecordRequestValidator = vine.compile(
  vine.object({
    purpose: vine.string().trim().minLength(8).maxLength(2000),
    accessMode: accessModeRule,
    requestingOfficeId: vine.string().uuid().optional(),
    neededBy: vine.string().optional(),
    dueAt: vine.string().optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    documentIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
  })
)

export const denyRecordRequestValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(3).maxLength(2000),
  })
)

export const releaseRecordRequestValidator = vine.compile(
  vine.object({
    itemIds: vine.array(vine.string().uuid()).minLength(1).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    dueAt: vine.string().optional(),
  })
)

export const returnRecordRequestValidator = vine.compile(
  vine.object({
    itemIds: vine.array(vine.string().uuid()).minLength(1).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
  })
)

export const cancelRecordRequestValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().maxLength(2000).optional(),
  })
)

export const listRecordRequestsValidator = vine.compile(
  vine.object({
    status: vine.string().trim().optional(),
    mine: vine.boolean().optional(),
    overdue: vine.boolean().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)
