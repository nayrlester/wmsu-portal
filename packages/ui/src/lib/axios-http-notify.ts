import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { emitHttpNotify } from './http-notify-bridge'
import {
  isTechnicalUserMessage,
  toUserFriendlyMessage,
  type UserFacingAction,
} from './user-facing-errors'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipHttpToast?: boolean
    skipHttpErrorToast?: boolean
    skipHttpSuccessToast?: boolean
  }
}

export type AttachAxiosHttpNotifyOptions = {
  silentUrlPatterns?: RegExp[]
  mutationMethods?: string[]
}

const DEFAULT_SILENT_URLS = [
  /\/auth\/refresh\b/i,
  /\/auth\/logout\b/i,
  /\/auth\/mfa\b/i,
]

const DEFAULT_MUTATIONS = ['post', 'put', 'patch', 'delete']

function urlOf(config?: InternalAxiosRequestConfig): string {
  return `${config?.baseURL ?? ''}${config?.url ?? ''}`
}

function shouldSilentUrl(url: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(url))
}

function shouldSkipErrorToast(error: AxiosError, silentPatterns: RegExp[]): boolean {
  const config = error.config
  if (!config) return false
  if (config.skipHttpToast || config.skipHttpErrorToast) return true
  if (error.code === 'ERR_CANCELED') return true
  if (error.response?.status === 401) return true
  if (error.response?.status === 404) return true
  if (shouldSilentUrl(urlOf(config), silentPatterns)) return true
  return false
}

function shouldSkipSuccessToast(
  response: AxiosResponse,
  silentPatterns: RegExp[]
): boolean {
  const config = response.config
  if (config.skipHttpToast || config.skipHttpSuccessToast) return true
  return shouldSilentUrl(urlOf(config), silentPatterns)
}

export function parseAxiosErrorMessage(error: AxiosError, fallback = 'Request failed'): string {
  const status = error.response?.status
  const data = error.response?.data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.message === 'string' && record.message.trim()) return record.message
    if (typeof record.error === 'string' && record.error.trim()) return record.error
    const errors = record.errors
    if (Array.isArray(errors) && errors[0] && typeof errors[0] === 'object') {
      const first = errors[0] as Record<string, unknown>
      if (typeof first.message === 'string' && first.message.trim()) return first.message
    }
    const nested = record.data
    if (nested && typeof nested === 'object') {
      const inner = nested as Record<string, unknown>
      if (typeof inner.message === 'string' && inner.message.trim()) return inner.message
    }
  }
  if (status === 503) {
    return 'The service is temporarily unavailable. Try again later.'
  }
  if (status === 502 || status === 504) {
    return 'The server took too long to respond. Try again.'
  }
  if (error.message) {
    if (/network error|failed to fetch|econnrefused/i.test(error.message)) {
      return 'Cannot reach the server. Confirm the API is running and try again.'
    }
    if (status) {
      return `${error.message} (HTTP ${status})`
    }
    return error.message
  }
  return fallback
}

export function userFacingAxiosError(
  error: AxiosError,
  action: UserFacingAction = 'generic'
): string {
  return toUserFriendlyMessage(
    parseAxiosErrorMessage(error, 'Something went wrong. Please try again.'),
    action
  )
}

export function parseAxiosSuccessMessage(response: AxiosResponse): string | null {
  const data = response.data
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) return record.message
  const nested = record.data
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>
    if (typeof inner.message === 'string' && inner.message.trim()) return inner.message
  }
  return null
}

export function attachAxiosHttpNotifications(
  client: AxiosInstance,
  options: AttachAxiosHttpNotifyOptions = {}
) {
  const silentPatterns = [...DEFAULT_SILENT_URLS, ...(options.silentUrlPatterns ?? [])]
  const mutationMethods = options.mutationMethods ?? DEFAULT_MUTATIONS

  client.interceptors.response.use(
    (response) => {
      if (shouldSkipSuccessToast(response, silentPatterns)) return response
      const method = (response.config.method ?? 'get').toLowerCase()
      if (!mutationMethods.includes(method)) return response
      const message = parseAxiosSuccessMessage(response)
      if (message) {
        const description = isTechnicalUserMessage(message)
          ? 'Your changes were saved.'
          : toUserFriendlyMessage(message, 'generic')
        emitHttpNotify({ title: 'Saved', description, tone: 'success' })
      }
      return response
    },
    (error) => {
      if (axios.isAxiosError(error) && !shouldSkipErrorToast(error, silentPatterns)) {
        emitHttpNotify({
          title: 'Something went wrong',
          description: userFacingAxiosError(error, 'generic'),
          tone: 'danger',
        })
      }
      return Promise.reject(error)
    }
  )
}
