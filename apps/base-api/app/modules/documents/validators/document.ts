import vine from '@vinejs/vine'
import {
  DocumentPriority,
  DocumentStatus,
  DocumentSourceType,
  DocumentVisibility,
  DocumentConfidentiality,
  NapCategory,
  RecordsLifecycleStatus,
  DispositionAction,
} from '#modules/documents/domain/enums/index'

const documentPriorityRule = vine.enum(Object.values(DocumentPriority))
const documentStatusRule = vine.enum(Object.values(DocumentStatus))
const documentVisibilityRule = vine.enum(Object.values(DocumentVisibility))
const documentSourceTypeRule = vine.enum(Object.values(DocumentSourceType))
const confidentialityRule = vine.enum(Object.values(DocumentConfidentiality))
const napCategoryRule = vine.enum(Object.values(NapCategory))
const lifecycleRule = vine.enum(Object.values(RecordsLifecycleStatus))
const dispositionRule = vine.enum(Object.values(DispositionAction))

const recordsFields = {
  originatingOfficeId: vine.string().uuid().optional(),
  receivingOfficeId: vine.string().uuid().optional(),
  documentDate: vine.string().optional(),
  receivedAt: vine.string().optional(),
  subjectKeywords: vine.string().trim().maxLength(2000).optional(),
  confidentiality: confidentialityRule.optional(),
  napCategory: napCategoryRule.optional(),
  retentionScheduleId: vine.string().uuid().optional(),
  lifecycleStatus: lifecycleRule.optional(),
  dispositionAction: dispositionRule.optional(),
}

export const createDocumentValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(500),
    description: vine.string().trim().optional(),
    priority: documentPriorityRule.optional(),
    documentTypeId: vine.string().uuid().optional(),
    departmentId: vine.string().uuid().optional(),
    assignedToId: vine.string().uuid().optional(),
    metadata: vine.record(vine.any()).optional(),
    contentHtml: vine.string().trim().minLength(1).optional(),
    visibility: documentVisibilityRule.optional(),
    sourceType: documentSourceTypeRule.optional(),
    ...recordsFields,
  })
)

export const updateDocumentValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(500).optional(),
    description: vine.string().trim().nullable().optional(),
    priority: documentPriorityRule.optional(),
    documentTypeId: vine.string().uuid().nullable().optional(),
    departmentId: vine.string().uuid().nullable().optional(),
    assignedToId: vine.string().uuid().nullable().optional(),
    metadata: vine.record(vine.any()).nullable().optional(),
    visibility: documentVisibilityRule.optional(),
    originatingOfficeId: vine.string().uuid().nullable().optional(),
    receivingOfficeId: vine.string().uuid().nullable().optional(),
    documentDate: vine.string().nullable().optional(),
    receivedAt: vine.string().nullable().optional(),
    subjectKeywords: vine.string().trim().maxLength(2000).nullable().optional(),
    confidentiality: confidentialityRule.optional(),
    napCategory: napCategoryRule.nullable().optional(),
    retentionScheduleId: vine.string().uuid().nullable().optional(),
    lifecycleStatus: lifecycleRule.optional(),
    dispositionAction: dispositionRule.nullable().optional(),
  })
)

export const saveDocumentContentValidator = vine.compile(
  vine.object({
    contentHtml: vine.string().trim(),
    changeNotes: vine.string().trim().maxLength(500).optional(),
  })
)

export const listDocumentsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    status: documentStatusRule.optional(),
    priority: documentPriorityRule.optional(),
    departmentId: vine.string().uuid().optional(),
    documentTypeId: vine.string().uuid().optional(),
    search: vine.string().trim().minLength(1).maxLength(200).optional(),
    cursor: vine.string().trim().minLength(8).maxLength(200).optional(),
    napCategory: napCategoryRule.optional(),
    lifecycleStatus: lifecycleRule.optional(),
    confidentiality: confidentialityRule.optional(),
    dueForArchive: vine.boolean().optional(),
    filePlanNodeId: vine.string().uuid().optional(),
    originatingOfficeId: vine.string().uuid().optional(),
    receivingOfficeId: vine.string().uuid().optional(),
  })
)

export const searchDocumentsValidator = vine.compile(
  vine.object({
    q: vine.string().trim().minLength(1).maxLength(200),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    status: documentStatusRule.optional(),
    priority: documentPriorityRule.optional(),
    departmentId: vine.string().uuid().optional(),
    documentTypeId: vine.string().uuid().optional(),
    napCategory: napCategoryRule.optional(),
    originatingOfficeId: vine.string().uuid().optional(),
    receivingOfficeId: vine.string().uuid().optional(),
  })
)
