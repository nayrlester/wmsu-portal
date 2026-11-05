import vine from '@vinejs/vine'

export const aiChatValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(4000),
    conversationId: vine.string().uuid().optional(),
  })
)
