import vine from '@vinejs/vine'

export const createAdminPlanValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    slug: vine.string().trim().minLength(2).maxLength(50).regex(/^[a-z0-9-]+$/),
    description: vine.string().trim().optional(),
    monthlyPrice: vine.number().min(0),
    annualPrice: vine.number().min(0),
    currency: vine.string().trim().fixedLength(3).optional(),
    maxUsers: vine.number().min(0).nullable().optional(),
    maxDocuments: vine.number().min(0).nullable().optional(),
    maxStorageBytes: vine.number().min(0).nullable().optional(),
    features: vine.record(vine.any()).nullable().optional(),
    isActive: vine.boolean().optional(),
    sortOrder: vine.number().min(0).optional(),
    stripePriceIdMonthly: vine.string().trim().nullable().optional(),
    stripePriceIdAnnual: vine.string().trim().nullable().optional(),
    paymongoPlanIdMonthly: vine.string().trim().nullable().optional(),
    paymongoPlanIdAnnual: vine.string().trim().nullable().optional(),
  })
)

export const updateAdminPlanValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    slug: vine.string().trim().minLength(2).maxLength(50).regex(/^[a-z0-9-]+$/).optional(),
    description: vine.string().trim().nullable().optional(),
    monthlyPrice: vine.number().min(0).optional(),
    annualPrice: vine.number().min(0).optional(),
    currency: vine.string().trim().fixedLength(3).optional(),
    maxUsers: vine.number().min(0).nullable().optional(),
    maxDocuments: vine.number().min(0).nullable().optional(),
    maxStorageBytes: vine.number().min(0).nullable().optional(),
    features: vine.record(vine.any()).nullable().optional(),
    isActive: vine.boolean().optional(),
    sortOrder: vine.number().min(0).optional(),
    stripePriceIdMonthly: vine.string().trim().nullable().optional(),
    stripePriceIdAnnual: vine.string().trim().nullable().optional(),
    paymongoPlanIdMonthly: vine.string().trim().nullable().optional(),
    paymongoPlanIdAnnual: vine.string().trim().nullable().optional(),
  })
)
