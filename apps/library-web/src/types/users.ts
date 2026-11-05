export type UserStatus = 'invited' | 'active' | 'suspended' | 'deactivated'
export type UserRoleCode = 'admin' | 'librarian' | 'staff' | 'member'

export interface StaffUser {
  id: string
  email: string
  fullName: string
  status: UserStatus
  roles: string[]
  platformUserId?: string | null
  isSystemAccount?: boolean
  createdAt?: string
}

export interface InviteUserPayload {
  email: string
  fullName: string
  roleCode: UserRoleCode
  password?: string
}

export interface UpdateUserPayload {
  fullName?: string
  status?: UserStatus
  roleCode?: UserRoleCode
}

export interface PaginatedMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}
