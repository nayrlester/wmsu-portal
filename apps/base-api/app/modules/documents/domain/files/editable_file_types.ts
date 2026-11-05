import type { AllowedMimeType } from '#modules/documents/domain/files/file_constants'

export type FileEditMode = 'text' | 'spreadsheet' | 'extracted_text'

export interface EditableFileDescriptor {
  mode: FileEditMode
  mimeType: AllowedMimeType
}

const EDITABLE_FILES: Record<string, EditableFileDescriptor> = {
  'text/plain': { mode: 'text', mimeType: 'text/plain' },
  'text/csv': { mode: 'text', mimeType: 'text/csv' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    mode: 'text',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  'application/vnd.ms-excel': { mode: 'spreadsheet', mimeType: 'application/vnd.ms-excel' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    mode: 'spreadsheet',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  'application/pdf': {
    mode: 'extracted_text',
    mimeType: 'application/pdf',
  },
  'image/png': {
    mode: 'extracted_text',
    mimeType: 'image/png',
  },
  'image/jpeg': {
    mode: 'extracted_text',
    mimeType: 'image/jpeg',
  },
  'application/msword': {
    mode: 'extracted_text',
    mimeType: 'application/msword',
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    mode: 'extracted_text',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
}

export function getEditableFileDescriptor(mimeType: string): EditableFileDescriptor | null {
  return EDITABLE_FILES[mimeType] ?? null
}

export function isEditableFileMime(mimeType: string, originalName?: string): boolean {
  if (mimeType in EDITABLE_FILES) return true
  if (!originalName) return false

  const lower = originalName.toLowerCase()
  if (mimeType === 'text/plain' && lower.endsWith('.csv')) return true

  return false
}
