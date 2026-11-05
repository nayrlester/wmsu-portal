export interface AuthRole {
  id: string
  name: string
  slug: string
  permissions: string[]
}

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  tenantId: string | null
  isSuperAdmin: boolean
  roles?: AuthRole[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

export type AuthProfile = AuthUser & {
  roles: AuthRole[]
  avatarUrl?: string | null
  permissions?: string[]
  platformPermissions?: string[]
}
