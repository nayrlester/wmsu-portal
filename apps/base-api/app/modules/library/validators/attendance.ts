import vine from '@vinejs/vine'

export const createAttendanceEventValidator = vine.compile(
  vine.object({
    cardNumber: vine.string().trim().minLength(1).maxLength(50),
    direction: vine.enum(['in', 'out']),
    source: vine.enum(['desk', 'kiosk', 'import']).optional(),
    occurredAt: vine.string().optional(),
    memberId: vine.string().uuid().optional(),
  })
)

export const listAttendanceEventsValidator = vine.compile(
  vine.object({
    date: vine.string().optional(),
    from: vine.string().optional(),
    to: vine.string().optional(),
    direction: vine.enum(['in', 'out']).optional(),
    source: vine.enum(['desk', 'kiosk', 'import']).optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)
