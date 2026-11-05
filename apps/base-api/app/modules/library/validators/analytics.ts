import vine from '@vinejs/vine'

export const analyticsDashboardValidator = vine.compile(
  vine.object({
    days: vine.number().min(7).max(90).optional(),
  })
)
