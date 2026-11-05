import { apiClient } from '@/lib/api-client'
import type {
  ApiResponse,
  AuthTokens,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  TenantInfo,
} from '@/types/auth'

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<
    ApiResponse<{ user: AuthUser; tokens: AuthTokens }>
  >(
    '/auth/login',
    { email: payload.email, password: payload.password },
    { headers: { 'X-Tenant-Slug': payload.tenantSlug }, skipHttpErrorToast: true }
  )
  return data.data
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<
    ApiResponse<{
      tenant: TenantInfo
      user: AuthUser
      tokens: AuthTokens
    }>
  >('/auth/register', payload)
  return data.data
}

export async function fetchMe() {
  const { data } = await apiClient.get<ApiResponse<{ user: AuthUser }>>('/auth/me')
  return data.data.user
}

export async function logout(refreshToken?: string) {
  await apiClient.post('/auth/logout', { refreshToken })
}

export async function resolveTenant(slug: string) {
  const { data } = await apiClient.get<ApiResponse<TenantInfo>>('/tenants/resolve', {
    params: { slug },
  })
  return data.data
}

export async function fetchCurrentTenant() {
  const { data } = await apiClient.get<ApiResponse<{ tenant: TenantInfo }>>('/tenant')
  return data.data.tenant
}

export async function updateCurrentTenant(payload: Partial<TenantInfo>) {
  const { data } = await apiClient.patch<ApiResponse<{ tenant: TenantInfo }>>('/tenant', {
    name: payload.name,
    timezone: payload.timezone,
    locale: payload.locale,
    logoUrl: payload.logoUrl,
    primaryColor: payload.primaryColor,
    reportScheduleEnabled: payload.reportScheduleEnabled,
    reportScheduleCron: payload.reportScheduleCron,
    reportScheduleEmails: payload.reportScheduleEmails,
  })
  return data.data.tenant
}
