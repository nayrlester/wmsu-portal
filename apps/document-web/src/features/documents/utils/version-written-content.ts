import type { VersionRecord } from '@/features/documents/types/document.types'

/** Written notes are separate from uploaded files — only surface when they were actually saved. */
export function shouldShowVersionWrittenContent(version: VersionRecord): boolean {
  if (!version.contentHtml?.trim()) return false
  if (version.sourceType === 'mixed') return true
  if (version.sourceType === 'editor' && version.files.length === 0) return true
  return false
}
