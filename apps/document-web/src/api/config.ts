import type { AxiosRequestConfig } from 'axios'
import { env } from '@/shared/constants/env'

export const API_HEADERS = {
  tenantId: 'X-Tenant-Id',
  authorization: 'Authorization',
  contentType: 'Content-Type',
} as const

function resolveBaseURL(): string {
  const configured = env.apiUrl?.trim()
  if (!configured) return '/api/v1/documents'
  const trimmed = configured.replace(/\/$/, '')
  if (/\/api\/v1(\/|$)/.test(trimmed)) return trimmed
  return `${trimmed}/api/v1/documents`
}

export const apiConfig = {
  baseURL: resolveBaseURL(),
  timeout: env.apiTimeoutMs,
  retry: {
    count: env.apiRetryCount,
    delayMs: env.apiRetryDelayMs,
    methods: ['get', 'head', 'options'] as const,
    statusCodes: [408, 429, 500, 502, 503, 504] as const,
  },
  auth: {
    refreshPath: '/auth/refresh',
    loginPath: '/auth/login',
    registerPath: '/auth/register',
  },
} as const

export type ApiRequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean
  skipTenant?: boolean
  _retry?: boolean
  _retryCount?: number
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean
    skipTenant?: boolean
    skipHttpToast?: boolean
    skipHttpErrorToast?: boolean
    skipHttpSuccessToast?: boolean
    _retry?: boolean
    _retryCount?: number
  }
}
