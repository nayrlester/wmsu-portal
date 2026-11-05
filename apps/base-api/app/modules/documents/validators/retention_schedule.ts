import vine from '@vinejs/vine'
import {
  DispositionAction,
  NapCategory,
} from '#modules/documents/domain/enums/index'

const napCategoryRule = vine.enum(Object.values(NapCategory))
const dispositionRule = vine.enum(Object.values(DispositionAction))

export const createRetentionScheduleValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    code: vine.string().trim().minLength(2).maxLength(80),
    napCategory: napCategoryRule,
    retentionYears: vine.number().min(0).max(200),
    retentionMonths: vine.number().min(0).max(11),
    dispositionAction: dispositionRule,
    description: vine.string().trim().maxLength(2000).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const updateRetentionScheduleValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    code: vine.string().trim().minLength(2).maxLength(80).optional(),
    napCategory: napCategoryRule.optional(),
    retentionYears: vine.number().min(0).max(200).optional(),
    retentionMonths: vine.number().min(0).max(11).optional(),
    dispositionAction: dispositionRule.optional(),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)
