import { z } from 'zod'

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') return value
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
  })

export const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('WMSU CIS Platform'),
  API_PORT: z.coerce.number().int().positive().default(3500),
  API_HOST: z.string().default('0.0.0.0'),
  WEB_PORTAL_PORT: z.coerce.number().int().positive().default(5173),
  ADMIN_PORTAL_PORT: z.coerce.number().int().positive().default(5174),
  WEB_PORTAL_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  ADMIN_PORTAL_ORIGIN: z.string().url().default('http://127.0.0.1:5174'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://wmsu:wmsu_dev_change_me@127.0.0.1:5433/wmsu_cis'),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6380'),
  QUEUE_NAME: z.string().default('wmsu-cis-jobs'),
  CORS_ORIGINS: z
    .string()
    .default('http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174'),
})

export type SharedEnv = z.infer<typeof sharedEnvSchema>

export function loadSharedEnv(source: NodeJS.ProcessEnv = process.env): SharedEnv {
  return sharedEnvSchema.parse(source)
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export { boolFromEnv }
