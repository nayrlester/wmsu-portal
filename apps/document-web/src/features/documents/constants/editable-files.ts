export const NATIVE_EDITABLE_FILE_MIME_TYPES = new Set([
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export const EXTRACTED_TEXT_EDIT_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

export const EDITABLE_FILE_MIME_TYPES = new Set([
  ...NATIVE_EDITABLE_FILE_MIME_TYPES,
  ...EXTRACTED_TEXT_EDIT_MIME_TYPES,
])

export function canEditFile(file: { mimeType: string; originalName: string }): boolean {
  if (EDITABLE_FILE_MIME_TYPES.has(file.mimeType)) return true

  const lower = file.originalName.toLowerCase()
  if (file.mimeType === 'text/plain' && lower.endsWith('.csv')) return true

  return false
}

export function isNativeEditableFileMime(mimeType: string): boolean {
  return NATIVE_EDITABLE_FILE_MIME_TYPES.has(mimeType)
}

export function isExtractedTextEditableMime(mimeType: string): boolean {
  return EXTRACTED_TEXT_EDIT_MIME_TYPES.has(mimeType)
}

export function isEditableFileMime(mimeType: string, originalName?: string): boolean {
  if (!originalName) return EDITABLE_FILE_MIME_TYPES.has(mimeType)
  return canEditFile({ mimeType, originalName })
}

export function getFileEditButtonLabel(): string {
  return 'Edit content'
}
