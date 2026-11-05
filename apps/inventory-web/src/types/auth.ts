export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  permissions: string[]
  roles: string[]
}

export interface LoginResponse {
  data: {
    user: AuthUser
    accessToken: string
    refreshToken: string
  }
}

export interface MeResponse {
  data: {
    user: AuthUser
  }
}
