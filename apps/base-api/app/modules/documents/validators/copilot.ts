import vine from '@vinejs/vine'

const pageContextSchema = vine.object({
  pathname: vine.string().optional(),
  documentId: vine.string().uuid().optional(),
  documentTitle: vine.string().optional(),
  documentStatus: vine.string().optional(),
  trackingNumber: vine.string().optional(),
})

const messageSchema = vine.object({
  role: vine.enum(['user', 'assistant', 'system'] as const),
  content: vine.string(),
})

const sessionRefSchema = vine.object({
  index: vine.number(),
  type: vine.enum(['document', 'file', 'user', 'workflow'] as const),
  id: vine.string(),
  label: vine.string(),
  href: vine.string().optional(),
})

export const copilotChatValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(2000),
    pageContext: pageContextSchema.optional(),
    history: vine.array(messageSchema).maxLength(20).optional(),
    sessionRefs: vine.array(sessionRefSchema).maxLength(20).optional(),
  })
)

export const copilotConfirmValidator = vine.compile(
  vine.object({
    actionId: vine.string().uuid(),
  })
)

export const copilotCancelValidator = vine.compile(
  vine.object({
    actionId: vine.string().uuid(),
  })
)
