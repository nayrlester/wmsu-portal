import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type { AuthProfile, AuthTokens, AuthUser } from '@/shared/types/auth.types'

export interface LoginSuccessResponse {
  user: AuthUser
  tokens: AuthTokens
  mfaRequired?: false
}

export interface LoginMfaResponse {
  mfaRequired: true
  mfaChallengeToken?: string
  message?: string
  user?: never
  tokens?: never
}

export type LoginResponse = LoginSuccessResponse | LoginMfaResponse

export interface RegisterInput {
  email: string
  password: string
  passwordConfirmation: string
  fullName: string
  organizationName: string
}

export interface RegisterResponse extends LoginSuccessResponse {
  tenant: {
    id: string
    name: string
    slug: string
  }
  message?: string
}

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiRequest(
      apiClient.post<LoginResponse>(
        '/auth/login',
        { email, password },
        { skipAuth: true, skipTenant: true, skipHttpErrorToast: true }
      )
    ),

  register: (data: RegisterInput): Promise<RegisterResponse> =>
    apiRequest(
      apiClient.post<RegisterResponse>('/auth/register', data, { skipAuth: true, skipTenant: true })
    ),

  profile: (): Promise<AuthProfile> => apiRequest(apiClient.get<AuthProfile>('/account/profile')),

  logout: (refreshToken: string): Promise<void> =>
    apiRequestVoid(apiClient.post('/account/logout', { refreshToken })),
}

export type { AuthUser, AuthTokens, AuthRole, AuthProfile } from '@/shared/types/auth.types'
