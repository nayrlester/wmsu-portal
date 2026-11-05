import { apiClient } from '@/lib/api-client'
import type { ApiResponse, AuthTokens, MePayload } from '@/types/auth'

export type LoginResult =
  | { tokens: AuthTokens; mfaRequired?: false }
  | { mfaRequired: true; mfaChallengeToken: string; message?: string }

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await apiClient.post<ApiResponse<LoginResult>>(
    '/auth/login',
    {
      email,
      password,
    },
    { skipHttpErrorToast: true }
  )
  return res.data.data
}

export async function verifyMfa(mfaChallengeToken: string, code: string) {
  const res = await apiClient.post<ApiResponse<{ tokens: AuthTokens }>>('/auth/mfa/verify', {
    mfaChallengeToken,
    code,
  })
  return res.data.data.tokens
}

export async function fetchMe() {
  const res = await apiClient.get<ApiResponse<MePayload>>('/auth/me')
  return res.data.data
}

export async function logoutApi(refreshToken?: string) {
  await apiClient.post('/auth/logout', { refreshToken })
}

export async function setupMfa() {
  const res = await apiClient.post<ApiResponse<{ secret: string; otpauthUrl: string }>>(
    '/auth/mfa/setup'
  )
  return res.data.data
}

export async function enableMfa(code: string) {
  await apiClient.post('/auth/mfa/enable', { code })
}
