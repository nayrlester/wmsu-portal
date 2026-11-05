export type SearchResultType = 'document' | 'file' | 'user' | 'workflow'

export interface SearchFilters {
  q: string
  limit?: number
  types?: SearchResultType[]
  /** Minimum OCR confidence (0–100) for file hits */
  minOcrConfidence?: number
}

export interface SearchDocumentHit {
  id: string
  title: string
  trackingNumber: string
  status: string
  snippet: string | null
  matchField: 'title' | 'description' | 'tracking_number' | 'ai_summary' | 'content'
}

export interface SearchFileHit {
  id: string
  documentId: string
  originalName: string
  mimeType: string
  fileSize: number
  documentTitle: string
  trackingNumber: string
  snippet: string | null
  matchField: 'filename' | 'content'
  ocrConfidence?: number | null
}

export interface SearchUserHit {
  id: string
  fullName: string | null
  email: string
  snippet: string | null
}

export interface SearchWorkflowHit {
  id: string
  name: string
  description: string | null
  status: string
  snippet: string | null
}

export interface UniversalSearchResult {
  query: string
  documents: SearchDocumentHit[]
  files: SearchFileHit[]
  users: SearchUserHit[]
  workflows: SearchWorkflowHit[]
  meta: {
    total: number
    documents: number
    files: number
    users: number
    workflows: number
  }
}

export interface ImageSearchResult extends UniversalSearchResult {
  extractedText: string
  ocrProvider: string
}
