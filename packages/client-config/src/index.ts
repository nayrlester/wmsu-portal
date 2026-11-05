/** Shared helpers for ULMIS Vite clients (web / opac / kiosk). */

type EnvBag = Record<string, string | undefined>

function readEnv(env?: EnvBag): EnvBag {
  if (env) return env
  try {
    return (import.meta as { env?: EnvBag }).env ?? {}
  } catch {
    return {}
  }
}

export function getApiBaseUrl(env?: EnvBag) {
  const raw = readEnv(env).VITE_API_URL?.trim()
  return raw && raw.length > 0 ? raw.replace(/\/$/, '') : '/api/v1/library'
}

export function getDefaultTenantSlug(env?: EnvBag) {
  return (readEnv(env).VITE_DEFAULT_TENANT_SLUG || 'ulmis').trim().toLowerCase()
}

export function getAppName(env?: EnvBag, fallback = 'University Library') {
  return readEnv(env).VITE_APP_NAME?.trim() || fallback
}

export interface OpacBookSummary {
  id: string
  title: string
  subtitle?: string | null
  authors?: string | null
  genre?: string | null
  isbn13?: string | null
  callNumber?: string | null
  isDigital?: boolean
  availableCopies?: number
  totalCopies?: number
  availability?: string
  publicationYear?: number | null
}

export interface OpacCitations {
  apa?: string
  mla?: string
  [key: string]: string | undefined
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: unknown
}
