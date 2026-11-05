export type BorrowingStatus =
  | 'requested'
  | 'approved'
  | 'borrowed'
  | 'returned'
  | 'overdue'
  | 'lost'

export interface Borrowing {
  id: string
  transactionNumber: string
  memberId: string
  memberName?: string
  memberCardNumber?: string
  bookId: string
  bookTitle?: string
  copyId: string | null
  copyBarcode?: string
  status: BorrowingStatus
  requestedAt: string
  approvedAt: string | null
  borrowedAt: string | null
  dueAt: string | null
  returnedAt: string | null
  lostAt: string | null
  notes: string | null
  renewalCount?: number
  maxRenewals?: number
  createdAt: string
}

export interface CirculationLoanRules {
  loanPeriodDays: number
  renewalPeriodDays: number
  maxRenewals: number
  finePerDayCents: number
  maxFineCents: number
  lostBookPenaltyCents: number
  maxActiveBorrowings: number
  holdPickupDays: number
  policyNote?: string
}

export interface BorrowingDashboard {
  activeLoans: number
  overdueCount: number
  dueTodayCount?: number
  pendingRequests: number
  readyForCheckout: number
  byStatus: Record<string, number>
  recentTransactions?: Borrowing[]
  loanRules?: CirculationLoanRules
}

export interface BorrowingListParams {
  search?: string
  status?: BorrowingStatus
  memberId?: string
  page?: number
  perPage?: number
}

export interface RequestBorrowPayload {
  memberId: string
  bookId: string
  copyId?: string
  notes?: string
  borrowedAt?: string
  dueAt?: string
}

export interface DirectCheckoutPayload {
  memberId: string
  copyId: string
  notes?: string
  borrowedAt?: string
  dueAt?: string
}

export const BORROWING_STATUS_LABELS: Record<BorrowingStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  borrowed: 'Borrowed',
  returned: 'Returned',
  overdue: 'Overdue',
  lost: 'Lost',
}
