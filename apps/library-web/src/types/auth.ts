export interface AuthUser {
  id: string
  email: string
  fullName: string
  tenantId: string
  roles: string[]
  permissions: string[]
}

export interface TenantInfo {
  id: string
  slug: string
  name: string
  type: string
  status?: string
  timezone?: string
  locale?: string
  logoUrl?: string | null
  primaryColor?: string | null
  reportScheduleEnabled?: boolean
  reportScheduleCron?: string | null
  reportScheduleEmails?: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface PaginationMeta {
  currentPage: number
  lastPage: number
  perPage?: number
  total?: number
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  meta?: PaginationMeta | Record<string, unknown>
  code?: string
  errors?: Array<{ field: string; message: string }>
}

export interface LoginPayload {
  email: string
  password: string
  tenantSlug: string
}

export interface RegisterPayload {
  tenantName: string
  tenantSlug: string
  tenantType: 'school' | 'university' | 'public_library' | 'corporate' | 'government'
  fullName: string
  email: string
  password: string
}
