import { Env } from '@adonisjs/core/env'
import { applyPlatformEnvMappings } from '#config/platform_env'

applyPlatformEnvMappings()

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  APP_NAME: Env.schema.string.optional(),
  FRONTEND_URL: Env.schema.string({ format: 'url', tld: false }),
  /**
   * Optional public base for QR /track links (phones cannot open localhost).
   * Example local LAN: http://192.168.x.x:5215
   */
  PUBLIC_TRACK_BASE_URL: Env.schema.string.optional({ format: 'url', tld: false }),

  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  DB_SCHEMA: Env.schema.string.optional(),
  DB_SSL: Env.schema.boolean.optional(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  LIMITER_STORE: Env.schema.enum(['redis', 'memory'] as const),

  MAIL_MAILER: Env.schema.enum(['smtp'] as const),
  MAIL_FROM: Env.schema.string.optional(),

  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  AWS_REGION: Env.schema.string.optional(),
  AWS_S3_BUCKET: Env.schema.string.optional(),
  /** Cloudflare R2 / S3-compatible endpoint, e.g. https://<account_id>.r2.cloudflarestorage.com */
  S3_ENDPOINT: Env.schema.string.optional(),
  /** Public CDN base for media, e.g. https://docs-pro-media.arzaitsolutions.site */
  S3_PUBLIC_CDN_URL: Env.schema.string.optional(),

  FILE_MAX_SIZE_MB: Env.schema.number.optional(),
  S3_SIGNED_URL_EXPIRES_SECONDS: Env.schema.number.optional(),

  STRIPE_SECRET_KEY: Env.schema.string.optional(),
  STRIPE_WEBHOOK_SECRET: Env.schema.string.optional(),
  PAYMONGO_SECRET_KEY: Env.schema.string.optional(),
  PAYMONGO_WEBHOOK_SECRET: Env.schema.string.optional(),
  BILLING_PROVIDER: Env.schema.enum.optional(['stripe', 'paymongo', 'stub'] as const),

  GOOGLE_CLIENT_ID: Env.schema.string.optional(),
  GOOGLE_CLIENT_SECRET: Env.schema.string.optional(),
  MICROSOFT_CLIENT_ID: Env.schema.string.optional(),
  MICROSOFT_CLIENT_SECRET: Env.schema.string.optional(),

  OPENAI_API_KEY: Env.schema.string.optional(),
  OPENAI_BASE_URL: Env.schema.string.optional(),
  OPENAI_MODEL: Env.schema.string.optional(),

  OCR_PROVIDER: Env.schema.string.optional(),
  AI_PROVIDER: Env.schema.string.optional(),
  INTELLIGENCE_QUEUE_CONCURRENCY: Env.schema.number.optional(),

  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USER: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),

  SENTRY_DSN: Env.schema.string.optional(),
  SENTRY_TRACES_SAMPLE_RATE: Env.schema.number.optional(),

  OTEL_EXPORTER_OTLP_ENDPOINT: Env.schema.string.optional(),
  OTEL_SERVICE_NAME: Env.schema.string.optional(),
  APP_VERSION: Env.schema.string.optional(),

  CORS_ORIGIN: Env.schema.string.optional(),

  /** local | platform | dual — default local preserves existing Adonis token auth. */
  AUTH_MODE: Env.schema.enum.optional(['local', 'platform', 'dual'] as const),
  PLATFORM_IDENTITY_URL: Env.schema.string.optional(),
  PLATFORM_JWKS_URL: Env.schema.string.optional(),
  PLATFORM_JWT_ISSUER: Env.schema.string.optional(),
  PLATFORM_JWT_AUDIENCE: Env.schema.string.optional(),
  PLATFORM_AUTO_PROVISION: Env.schema.boolean.optional(),
  PLATFORM_DEFAULT_TENANT_ID: Env.schema.string.optional(),
  PLATFORM_DEFAULT_TENANT_SLUG: Env.schema.string.optional(),

  /** Optional platform document-service bridge (separate from e-sign). */
  PLATFORM_DOCUMENTS_URL: Env.schema.string.optional(),
  SERVICE_API_KEY: Env.schema.string.optional(),

  CACHE_TTL_TENANT_SECONDS: Env.schema.number.optional(),
  CACHE_TTL_PERMISSIONS_SECONDS: Env.schema.number.optional(),
  CACHE_TTL_DASHBOARD_SECONDS: Env.schema.number.optional(),
  CACHE_TTL_SEARCH_SECONDS: Env.schema.number.optional(),
  CACHE_TTL_LOOKUPS_SECONDS: Env.schema.number.optional(),

  SLOW_REQUEST_MS: Env.schema.number.optional(),
  FILE_PROCESSING_QUEUE_CONCURRENCY: Env.schema.number.optional(),
  MAX_CONCURRENT_UPLOADS: Env.schema.number.optional(),

  MEILISEARCH_HOST: Env.schema.string.optional(),
  MEILISEARCH_API_KEY: Env.schema.string.optional(),

  DB_POOL_MIN: Env.schema.number.optional(),
  DB_POOL_MAX: Env.schema.number.optional(),
  DB_POOL_IDLE_TIMEOUT_MS: Env.schema.number.optional(),

  QUEUE_PREFIX: Env.schema.string.optional(),
  QUEUE_CONCURRENCY: Env.schema.number.optional(),
  QUEUE_SYNC: Env.schema.boolean.optional(),

  SOCKET_IO_ENABLED: Env.schema.boolean.optional(),
  SOCKET_IO_PATH: Env.schema.string.optional(),
  SOCKET_IO_REDIS_ADAPTER: Env.schema.boolean.optional(),

  FIREBASE_PROJECT_ID: Env.schema.string.optional(),
  FIREBASE_CLIENT_EMAIL: Env.schema.string.optional(),
  FIREBASE_PRIVATE_KEY: Env.schema.string.optional(),

  /** Bearer token required for GET /metrics in production */
  METRICS_TOKEN: Env.schema.string.optional(),

  /** PandaDoc e-sign (API host webhook — not the Vercel SPA) */
  PANDADOC_ENABLED: Env.schema.boolean.optional(),
  PANDADOC_API_KEY: Env.schema.string.optional(),
  PANDADOC_WEBHOOKS_SECRET: Env.schema.string.optional(),
  PANDADOC_API_BASE_URL: Env.schema.string.optional(),
  /** Workspace member email for Embedded Sending (field placement). Falls back to actor email. */
  PANDADOC_EDITOR_EMAIL: Env.schema.string.optional(),
})
