import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DocumentsViewMode = 'tile' | 'list' | 'details'

interface DocumentsUiState {
  search: string
  status: string
  lifecycleStatus: string
  confidentiality: string
  napCategory: string
  dueForArchive: boolean
  viewMode: DocumentsViewMode
  selectedDocumentId: string | null
  setSearch: (search: string) => void
  setStatus: (status: string) => void
  setLifecycleStatus: (lifecycleStatus: string) => void
  setConfidentiality: (confidentiality: string) => void
  setNapCategory: (napCategory: string) => void
  setDueForArchive: (dueForArchive: boolean) => void
  setViewMode: (viewMode: DocumentsViewMode) => void
  setSelectedDocumentId: (id: string | null) => void
  reset: () => void
}

const initialState = {
  search: '',
  status: '',
  lifecycleStatus: '',
  confidentiality: '',
  napCategory: '',
  dueForArchive: false,
  viewMode: 'list' as DocumentsViewMode,
  selectedDocumentId: null as string | null,
}

export const useDocumentsUiStore = create<DocumentsUiState>()(
  persist(
    (set) => ({
      ...initialState,
      setSearch: (search) => set({ search }),
      setStatus: (status) => set({ status }),
      setLifecycleStatus: (lifecycleStatus) => set({ lifecycleStatus }),
      setConfidentiality: (confidentiality) => set({ confidentiality }),
      setNapCategory: (napCategory) => set({ napCategory }),
      setDueForArchive: (dueForArchive) => set({ dueForArchive }),
      setViewMode: (viewMode) => set({ viewMode, selectedDocumentId: null }),
      setSelectedDocumentId: (selectedDocumentId) => set({ selectedDocumentId }),
      reset: () => set(initialState),
    }),
    {
      name: 'documents-ui',
      partialize: (state) => ({ viewMode: state.viewMode }),
    }
  )
)
