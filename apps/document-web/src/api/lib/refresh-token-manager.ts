import axios from 'axios'
import { apiConfig } from '@/api/config'
import { tokenStorage } from '@/shared/lib/token-storage'
import { sessionManager } from '@/api/lib/session-manager'
import { normalizeAxiosError } from '@/api/errors/api-error'
import type { AuthTokens } from '@/shared/types/auth.types'

interface RefreshResponse {
  tokens: AuthTokens
}

type QueueEntry = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let refreshQueue: QueueEntry[] = []

function drainQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else if (token) resolve(token)
  })
  refreshQueue = []
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    throw normalizeAxiosError(new Error('No refresh token available'))
  }

  const { data } = await axios.post<RefreshResponse>(
    `${apiConfig.baseURL}${apiConfig.auth.refreshPath}`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: apiConfig.timeout }
  )

  tokenStorage.setTokens(data.tokens.accessToken, data.tokens.refreshToken)
  return data.tokens.accessToken
}

export function enqueueRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject })
    })
  }

  isRefreshing = true

  return refreshAccessToken()
    .then((token) => {
      drainQueue(null, token)
      return token
    })
    .catch((error) => {
      drainQueue(error, null)
      tokenStorage.clear()
      sessionManager.forceLogout()
      throw error
    })
    .finally(() => {
      isRefreshing = false
    })
}

export function isAuthRoute(url: string | undefined): boolean {
  if (!url) return false
  return (
    url.includes(apiConfig.auth.refreshPath) ||
    url.includes(apiConfig.auth.loginPath) ||
    url.includes(apiConfig.auth.registerPath)
  )
}
