import { describe, expect, it, beforeEach } from 'vitest'
import { useDocumentsUiStore } from '@/features/documents/store/documents-ui.store'

describe('documents-ui.store', () => {
  beforeEach(() => {
    useDocumentsUiStore.setState({
      search: '',
      status: '',
      lifecycleStatus: '',
      confidentiality: '',
      napCategory: '',
      dueForArchive: false,
      viewMode: 'list',
      selectedDocumentId: null,
    })
  })

  it('updates view mode and clears selection', () => {
    useDocumentsUiStore.getState().setSelectedDocumentId('doc-1')
    useDocumentsUiStore.getState().setViewMode('tile')

    expect(useDocumentsUiStore.getState().viewMode).toBe('tile')
    expect(useDocumentsUiStore.getState().selectedDocumentId).toBeNull()
  })
})
