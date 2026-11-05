import { create } from 'zustand'
import type { BorrowingStatus } from '@/types/borrowings'

interface CirculationState {
  search: string
  page: number
  perPage: number
  statusFilter: BorrowingStatus | 'all'
  showRequestModal: boolean
  showReturnPanel: boolean
  selectedBorrowingId: string | null
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setStatusFilter: (status: BorrowingStatus | 'all') => void
  openRequestModal: () => void
  closeRequestModal: () => void
  openReturnPanel: (borrowingId: string) => void
  closeReturnPanel: () => void
}

export const useCirculationStore = create<CirculationState>((set) => ({
  search: '',
  page: 1,
  perPage: 20,
  statusFilter: 'all',
  showRequestModal: false,
  showReturnPanel: false,
  selectedBorrowingId: null,
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  openRequestModal: () => set({ showRequestModal: true }),
  closeRequestModal: () => set({ showRequestModal: false }),
  openReturnPanel: (borrowingId) =>
    set({ showReturnPanel: true, selectedBorrowingId: borrowingId }),
  closeReturnPanel: () => set({ showReturnPanel: false, selectedBorrowingId: null }),
}))
