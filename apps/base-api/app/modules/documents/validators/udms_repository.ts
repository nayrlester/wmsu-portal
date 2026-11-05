import vine from '@vinejs/vine'
import {
  DocumentConfidentiality,
  DocumentPriority,
  DocumentVisibility,
  NapCategory,
  ReceivingChannel,
} from '#modules/documents/domain/enums/index'

const napCategoryRule = vine.enum(Object.values(NapCategory))
const confidentialityRule = vine.enum(Object.values(DocumentConfidentiality))
const receivingChannelRule = vine.enum(Object.values(ReceivingChannel))

export const registerUdmsDocumentValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(500),
    description: vine.string().trim().maxLength(5000).optional(),
    documentTypeId: vine.string().uuid(),
    documentDate: vine.string().trim().minLength(4),
    subjectKeywords: vine.string().trim().minLength(1).maxLength(2000),
    originatingOfficeId: vine.string().uuid(),
    receivingOfficeId: vine.string().uuid(),
    napCategory: napCategoryRule,
    retentionScheduleId: vine.string().uuid().optional(),
    confidentiality: confidentialityRule.optional(),
    receivingChannel: receivingChannelRule.optional(),
    departmentId: vine.string().uuid().optional(),
    filePlanNodeId: vine.string().uuid().optional(),
    priority: vine.enum(Object.values(DocumentPriority)).optional(),
    visibility: vine.enum(Object.values(DocumentVisibility)).optional(),
    metadata: vine.record(vine.any()).optional(),
    contentHtml: vine.string().trim().minLength(1).optional(),
  })
)

export const updateUdmsMetadataValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(500).optional(),
    description: vine.string().trim().maxLength(5000).nullable().optional(),
    documentTypeId: vine.string().uuid().nullable().optional(),
    documentDate: vine.string().trim().nullable().optional(),
    subjectKeywords: vine.string().trim().maxLength(2000).nullable().optional(),
    originatingOfficeId: vine.string().uuid().nullable().optional(),
    receivingOfficeId: vine.string().uuid().nullable().optional(),
    napCategory: napCategoryRule.nullable().optional(),
    retentionScheduleId: vine.string().uuid().nullable().optional(),
    confidentiality: confidentialityRule.optional(),
    receivingChannel: receivingChannelRule.nullable().optional(),
    departmentId: vine.string().uuid().nullable().optional(),
    filePlanNodeId: vine.string().uuid().nullable().optional(),
    priority: vine.enum(Object.values(DocumentPriority)).optional(),
  })
)

export const listUdmsRepositoryValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    search: vine.string().trim().minLength(1).maxLength(200).optional(),
    trackingNumber: vine.string().trim().minLength(1).maxLength(50).optional(),
    departmentId: vine.string().uuid().optional(),
    documentTypeId: vine.string().uuid().optional(),
    originatingOfficeId: vine.string().uuid().optional(),
    receivingOfficeId: vine.string().uuid().optional(),
    napCategory: napCategoryRule.optional(),
    confidentiality: confidentialityRule.optional(),
    filePlanNodeId: vine.string().uuid().optional(),
    status: vine.string().trim().optional(),
  })
)

export const createFilePlanNodeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    code: vine.string().trim().maxLength(80).optional(),
    parentId: vine.string().uuid().optional(),
    sortOrder: vine.number().min(0).optional(),
  })
)

export const updateFilePlanNodeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255).optional(),
    code: vine.string().trim().maxLength(80).nullable().optional(),
    sortOrder: vine.number().min(0).optional(),
    isActive: vine.boolean().optional(),
  })
)
