import vine from '@vinejs/vine'

export const universalSearchValidator = vine.compile(
  vine.object({
    q: vine.string().trim().minLength(1).maxLength(200),
    limit: vine
      .any()
      .optional()
      .transform((value) => {
        if (value === undefined || value === null || value === '') return undefined
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : undefined
      }),
    minOcrConfidence: vine
      .any()
      .optional()
      .transform((value) => {
        if (value === undefined || value === null || value === '') return undefined
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) return undefined
        return Math.min(100, Math.max(0, parsed))
      }),
    types: vine
      .any()
      .optional()
      .transform((value): string[] | undefined => {
        if (value === undefined || value === null || value === '') return undefined
        const raw = Array.isArray(value) ? value.flat().join(',') : String(value)
        const parsed = raw
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
        return parsed.length > 0 ? parsed : undefined
      }),
  })
)
