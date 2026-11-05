import vine from '@vinejs/vine'
import { RecordsLifecycleStatus } from '#modules/documents/domain/enums/index'

export const listUdmsLifecycleQueueValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    search: vine.string().trim().minLength(1).maxLength(200).optional(),
    status: vine.string().trim().optional(),
    lifecycleStatus: vine.enum(Object.values(RecordsLifecycleStatus)).optional(),
  })
)

export const createUdmsVersionValidator = vine.compile(
  vine.object({
    changeNotes: vine.string().trim().minLength(1).maxLength(2000).optional(),
  })
)

export const applyUdmsRetentionValidator = vine.compile(
  vine.object({
    retentionScheduleId: vine.string().uuid(),
  })
)

export const restoreUdmsDocumentValidator = vine.compile(
  vine.object({
    remarks: vine.string().trim().minLength(1).maxLength(2000),
    targetLifecycleStatus: vine
      .enum([
        RecordsLifecycleStatus.ACTIVE,
        RecordsLifecycleStatus.SEMI_ACTIVE,
        RecordsLifecycleStatus.INACTIVE,
      ])
      .optional(),
  })
)

export const setUdmsLifecycleValidator = vine.compile(
  vine.object({
    lifecycleStatus: vine.enum(Object.values(RecordsLifecycleStatus)),
    remarks: vine.string().trim().maxLength(2000).optional(),
  })
)

export const createUdmsArchivalTransferValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(255),
    documentIds: vine.array(vine.string().uuid()).minLength(1),
  })
)

export const createUdmsDisposalValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(255),
    justification: vine.string().trim().minLength(3).maxLength(4000),
    documentIds: vine.array(vine.string().uuid()).minLength(1),
  })
)

export const executeUdmsDisposalValidator = vine.compile(
  vine.object({
    notes: vine.string().trim().maxLength(4000).optional(),
  })
)

export const setUdmsLegalHoldValidator = vine.compile(
  vine.object({
    hold: vine.boolean(),
    reason: vine.string().trim().minLength(3).maxLength(2000),
  })
)
