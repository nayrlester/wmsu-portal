import vine from '@vinejs/vine'

export const upsertUlmisSettingValidator = vine.compile(
  vine.object({
    settingKey: vine.string().trim().minLength(1).maxLength(128),
    settingValue: vine.object({}).allowUnknownProperties(),
    description: vine.string().trim().maxLength(500).optional(),
  })
)

export const listOutboxValidator = vine.compile(
  vine.object({
    status: vine.enum(['pending', 'processing', 'sent', 'failed', 'cancelled'] as const).optional(),
    contractCode: vine.string().trim().maxLength(64).optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)
