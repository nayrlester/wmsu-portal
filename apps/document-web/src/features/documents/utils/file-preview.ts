export function isDocxFile(mimeType: string, originalName?: string): boolean {
  const lower = originalName?.toLowerCase() ?? ''
  return (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  )
}

export function canInlinePreviewFile(mimeType: string, originalName?: string): boolean {
  if (mimeType.startsWith('image/') || mimeType === 'application/pdf') return true
  if (mimeType === 'text/plain' || mimeType === 'text/csv') return true
  if (originalName?.toLowerCase().endsWith('.csv') && mimeType === 'text/plain') return true
  return false
}

export type FilePreviewMode = 'image' | 'iframe' | 'docx-html' | 'text-fallback'

export function getFilePreviewMode(
  mimeType: string,
  originalName?: string
): FilePreviewMode {
  if (mimeType.startsWith('image/')) return 'image'
  if (isDocxFile(mimeType, originalName)) return 'docx-html'
  if (canInlinePreviewFile(mimeType, originalName)) return 'iframe'
  return 'text-fallback'
}
