import { z } from 'zod'

export const pingQuerySchema = z.object({
  echo: z.string().max(120).optional(),
})

export type PingQuery = z.infer<typeof pingQuerySchema>

export function parsePingQuery(input: unknown): PingQuery {
  return pingQuerySchema.parse(input)
}
