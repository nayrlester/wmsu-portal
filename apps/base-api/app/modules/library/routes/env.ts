/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  /**
   * university (default) = single-institution ULMIS (no SaaS org signup)
   * saas = multi-org product mode (public register allowed unless overridden)
   */
  DEPLOYMENT_MODE: Env.schema.enum.optional(['university', 'saas'] as const),
  DEFAULT_TENANT_SLUG: Env.schema.string.optional(),
  ALLOW_PUBLIC_REGISTER: Env.schema.boolean.optional(),
  INSTITUTION_NAME: Env.schema.string.optional(),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  DB_SCHEMA: Env.schema.string.optional(),
  /** Set true for managed Postgres (Supabase, RDS, etc.) */
  DB_SSL: Env.schema.boolean.optional(),

  JWT_SECRET: Env.schema.secret(),
  JWT_ACCESS_EXPIRES_IN: Env.schema.string.optional(),
  JWT_REFRESH_EXPIRES_DAYS: Env.schema.number.optional(),

  AUTH_MODE: Env.schema.enum.optional(['local', 'platform', 'dual'] as const),
  PLATFORM_IDENTITY_URL: Env.schema.string.optional(),
  PLATFORM_JWKS_URL: Env.schema.string.optional(),
  PLATFORM_JWT_ISSUER: Env.schema.string.optional(),
  PLATFORM_JWT_AUDIENCE: Env.schema.string.optional(),
  PLATFORM_AUTO_PROVISION: Env.schema.boolean.optional(),
  PLATFORM_DEFAULT_TENANT_ID: Env.schema.string.optional(),
  PLATFORM_DEFAULT_TENANT_SLUG: Env.schema.string.optional(),
  PLATFORM_DOCUMENTS_URL: Env.schema.string.optional(),
  SERVICE_API_KEY: Env.schema.string.optional(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  /** Requests per window (rate limit runs before JWT; Bearer token is inspected). */
  RATE_LIMIT_WINDOW_SECONDS: Env.schema.number.optional(),
  RATE_LIMIT_AUTHENTICATED: Env.schema.number.optional(),
  RATE_LIMIT_UNAUTHENTICATED: Env.schema.number.optional(),

  OPENAI_API_KEY: Env.schema.string.optional(),
  AI_MODEL: Env.schema.string.optional(),

  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USER: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string.optional(),

  TWILIO_ACCOUNT_SID: Env.schema.string.optional(),
  TWILIO_AUTH_TOKEN: Env.schema.string.optional(),
  TWILIO_FROM_NUMBER: Env.schema.string.optional(),

  CORS_ORIGIN: Env.schema.string.optional(),
})
