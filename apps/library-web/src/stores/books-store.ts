import { create } from 'zustand'
import type { Book } from '@/types/books'

interface BooksUiState {
  search: string
  materialType: string
  page: number
  perPage: number
  isFormOpen: boolean
  editingBook: Book | null
  selectedBookId: string | null
  setSearch: (search: string) => void
  setMaterialType: (materialType: string) => void
  setPage: (page: number) => void
  openCreateForm: () => void
  openEditForm: (book: Book) => void
  closeForm: () => void
  setSelectedBookId: (id: string | null) => void
}

export const useBooksStore = create<BooksUiState>((set) => ({
  search: '',
  materialType: '',
  page: 1,
  perPage: 25,
  isFormOpen: false,
  editingBook: null,
  selectedBookId: null,
  setSearch: (search) => set({ search, page: 1 }),
  setMaterialType: (materialType) => set({ materialType, page: 1 }),
  setPage: (page) => set({ page }),
  openCreateForm: () => set({ isFormOpen: true, editingBook: null }),
  openEditForm: (book) => set({ isFormOpen: true, editingBook: book }),
  closeForm: () => set({ isFormOpen: false, editingBook: null }),
  setSelectedBookId: (id) => set({ selectedBookId: id }),
}))
