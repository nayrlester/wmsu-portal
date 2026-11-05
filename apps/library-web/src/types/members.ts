export type MemberType = 'student' | 'faculty' | 'employee' | 'researcher' | 'guest'

export type MembershipStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expired'

export interface Member {
  id: string
  fullName: string
  email: string | null
  contact: string | null
  department: string | null
  memberType: MemberType
  membershipStatus: MembershipStatus
  libraryCardNumber: string
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

export interface MemberDetail extends Member {
  borrowingHistory: BorrowingHistoryResponse
}

export interface BorrowingHistoryItem {
  id: string
  bookId: string | null
  bookTitle: string | null
  status: string
  borrowedAt: string | null
  dueAt: string | null
  returnedAt: string | null
  notes: string | null
}

export interface BorrowingHistoryResponse {
  items: BorrowingHistoryItem[]
  placeholder: boolean
  message?: string
}

export interface MemberCardData {
  memberId: string
  fullName: string
  libraryCardNumber: string
  memberType: MemberType
  membershipStatus: MembershipStatus
  department: string | null
  tenantSlug: string
  tenantName: string
  qrPayload: string
}

export interface MemberListParams {
  search?: string
  memberType?: MemberType
  membershipStatus?: MembershipStatus
  department?: string
  page?: number
  perPage?: number
}

export interface CreateMemberPayload {
  fullName: string
  email?: string
  contact?: string
  department?: string
  memberType: MemberType
  notes?: string
  autoApprove?: boolean
}

export interface UpdateMemberPayload {
  fullName?: string
  email?: string | null
  contact?: string | null
  department?: string | null
  memberType?: MemberType
  membershipStatus?: MembershipStatus
  notes?: string | null
}

export interface PaginatedMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  student: 'Student',
  faculty: 'Faculty',
  employee: 'Employee',
  researcher: 'Researcher',
  guest: 'Guest',
}

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  expired: 'Expired',
}
