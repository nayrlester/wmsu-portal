import vine from '@vinejs/vine'

export const listAuditLogsValidator = vine.compile(
  vine.object({
    action: vine.string().trim().optional(),
    resourceType: vine.string().trim().optional(),
    userId: vine.string().uuid().optional(),
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)
