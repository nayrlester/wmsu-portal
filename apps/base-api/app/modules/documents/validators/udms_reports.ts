import vine from '@vinejs/vine'

export const udmsReportFiltersValidator = vine.compile(
  vine.object({
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    officeId: vine.string().uuid().optional(),
    documentTypeId: vine.string().uuid().optional(),
    napCategory: vine.string().trim().optional(),
    status: vine.string().trim().optional(),
    lifecycleStatus: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(200).optional(),
    format: vine.enum(['json', 'csv'] as const).optional(),
  })
)
