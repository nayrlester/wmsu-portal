import vine from '@vinejs/vine'

export const updateTenantValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(200).optional(),
    timezone: vine.string().trim().minLength(2).maxLength(64).optional(),
    locale: vine.string().trim().minLength(2).maxLength(32).optional(),
    logoUrl: vine.string().trim().maxLength(500).optional(),
    primaryColor: vine.string().trim().maxLength(32).optional(),
    reportScheduleEnabled: vine.boolean().optional(),
    reportScheduleCron: vine.string().trim().maxLength(64).optional(),
    reportScheduleEmails: vine.string().trim().maxLength(2000).optional(),
  })
)
