import vine from '@vinejs/vine'
import {
  DigitizationBatchStatus,
  OcrQaStatus,
  ReceivingChannel,
  ReceivingReceiptStatus,
} from '#modules/documents/domain/enums/index'

export const createDigitizationBatchValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    notes: vine.string().trim().maxLength(2000).optional(),
  })
)

export const addDigitizationItemValidator = vine.compile(
  vine.object({
    label: vine.string().trim().minLength(2).maxLength(255),
    documentId: vine.string().uuid().optional(),
    physicalBoxId: vine.string().trim().maxLength(120).optional(),
    physicalFolderId: vine.string().trim().maxLength(120).optional(),
  })
)

export const qaDigitizationItemValidator = vine.compile(
  vine.object({
    ocrQaStatus: vine.enum([OcrQaStatus.PASSED, OcrQaStatus.FAILED, OcrQaStatus.SKIPPED]),
    qaNotes: vine.string().trim().maxLength(2000).optional(),
    physicalBoxId: vine.string().trim().maxLength(120).optional(),
    physicalFolderId: vine.string().trim().maxLength(120).optional(),
    checklist: vine
      .array(
        vine.object({
          key: vine.string(),
          done: vine.boolean(),
        })
      )
      .optional(),
  })
)

export const listDigitizationBatchesValidator = vine.compile(
  vine.object({
    status: vine.enum(Object.values(DigitizationBatchStatus)).optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)

export const createReceivingReceiptValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    channel: vine.enum(Object.values(ReceivingChannel)),
    receivedAt: vine.string().optional(),
    senderName: vine.string().trim().maxLength(255).optional(),
    description: vine.string().trim().maxLength(2000).optional(),
    originatingOfficeId: vine.string().uuid().optional(),
    receivingOfficeId: vine.string().uuid().optional(),
    physicalBoxId: vine.string().trim().maxLength(120).optional(),
    physicalFolderId: vine.string().trim().maxLength(120).optional(),
    acknowledgmentNotes: vine.string().trim().maxLength(2000).optional(),
  })
)

export const registerReceivingReceiptValidator = vine.compile(
  vine.object({
    documentId: vine.string().uuid().optional(),
    createDocument: vine.boolean().optional(),
  })
)

export const listReceivingReceiptsValidator = vine.compile(
  vine.object({
    channel: vine.enum(Object.values(ReceivingChannel)).optional(),
    status: vine.enum(Object.values(ReceivingReceiptStatus)).optional(),
    date: vine.string().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)
