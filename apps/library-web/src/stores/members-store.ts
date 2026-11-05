import { create } from 'zustand'
import type { Member, MembershipStatus, MemberType } from '@/types/members'

interface MembersUiState {
  search: string
  page: number
  perPage: number
  statusFilter: MembershipStatus | 'all'
  typeFilter: MemberType | 'all'
  isFormOpen: boolean
  editingMember: Member | null
  showPendingPanel: boolean
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setStatusFilter: (status: MembershipStatus | 'all') => void
  setTypeFilter: (type: MemberType | 'all') => void
  openCreateForm: () => void
  openEditForm: (member: Member) => void
  closeForm: () => void
  togglePendingPanel: () => void
  setShowPendingPanel: (show: boolean) => void
}

export const useMembersStore = create<MembersUiState>((set) => ({
  search: '',
  page: 1,
  perPage: 25,
  statusFilter: 'all',
  typeFilter: 'all',
  isFormOpen: false,
  editingMember: null,
  showPendingPanel: false,
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setTypeFilter: (typeFilter) => set({ typeFilter, page: 1 }),
  openCreateForm: () => set({ isFormOpen: true, editingMember: null }),
  openEditForm: (member) => set({ isFormOpen: true, editingMember: member }),
  closeForm: () => set({ isFormOpen: false, editingMember: null }),
  togglePendingPanel: () => set((s) => ({ showPendingPanel: !s.showPendingPanel })),
  setShowPendingPanel: (show) => set({ showPendingPanel: show }),
}))
