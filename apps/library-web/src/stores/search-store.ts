import { create } from 'zustand'
import type { SearchEntityType, SearchPreset } from '@/types/search'

interface SearchState {
  sidebarOpen: boolean
  selectedTypes: SearchEntityType[]
  preset: SearchPreset | null
  genre: string | null
  categoryId: string | null
  memberType: string | null
  status: string | null
  setSidebarOpen: (open: boolean) => void
  toggleType: (type: SearchEntityType) => void
  setPreset: (preset: SearchPreset | null) => void
  setGenre: (genre: string | null) => void
  setCategoryId: (categoryId: string | null) => void
  setMemberType: (memberType: string | null) => void
  setStatus: (status: string | null) => void
  resetFilters: () => void
  applySavedFilters: (filters: {
    types?: string[]
    preset?: string
    genre?: string
    categoryId?: string
    memberType?: string
    status?: string
  }) => void
}

export const useSearchStore = create<SearchState>((set, get) => ({
  sidebarOpen: true,
  selectedTypes: [],
  preset: null,
  genre: null,
  categoryId: null,
  memberType: null,
  status: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleType: (type) => {
    const current = get().selectedTypes
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    set({ selectedTypes: next })
  },
  setPreset: (preset) => set({ preset, selectedTypes: preset ? [] : get().selectedTypes }),
  setGenre: (genre) => set({ genre }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setMemberType: (memberType) => set({ memberType }),
  setStatus: (status) => set({ status }),
  resetFilters: () =>
    set({
      selectedTypes: [],
      preset: null,
      genre: null,
      categoryId: null,
      memberType: null,
      status: null,
    }),
  applySavedFilters: (filters) =>
    set({
      selectedTypes: (filters.types as SearchEntityType[]) ?? [],
      preset: (filters.preset as SearchPreset) ?? null,
      genre: filters.genre ?? null,
      categoryId: filters.categoryId ?? null,
      memberType: filters.memberType ?? null,
      status: filters.status ?? null,
    }),
}))
