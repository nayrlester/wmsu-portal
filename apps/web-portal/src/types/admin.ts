export type AdminUser = {
  id: string
  email: string
  fullName: string
  status: 'active' | 'disabled'
  roles: string[]
  platforms: string[]
  studentNumber?: string | null
  externalId?: string | null
  externalSource?: string | null
  lastLoginAt: string | null
}

export type AdminRole = {
  id: string
  code: string
  name: string
  description: string | null
  permissions: string[]
}

export type AdminPlatform = {
  id: string
  code: string
  name: string
  description: string | null
  active: boolean
  requiresSso: boolean
  sortOrder: number
}

export type CreateUserPayload = {
  email: string
  fullName: string
  password: string
  roleCodes: string[]
  platformCodes: string[]
}

export type UpdateUserPayload = {
  fullName?: string
  status?: 'active' | 'disabled'
  password?: string
  roleCodes?: string[]
  platformCodes?: string[]
}
