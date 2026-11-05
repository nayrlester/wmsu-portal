export type AuthUser = {
  id: string
  email: string
  fullName: string | null
}

export type AuthPlatform = {
  code: string
  name: string
  description: string | null
  launchUrl: string | null
  requiresSso: boolean
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export type MePayload = {
  user: AuthUser
  organization: {
    id: string
    slug: string
    apps: Record<string, string>
  } | null
  roles: string[]
  permissions: string[]
  platforms: AuthPlatform[]
}

export type ApiResponse<T> = {
  data: T
  error?: string
  message?: string
}
