import {
  isAllowedMimeType,
  mimeFromExtension,
  type AllowedMimeType,
} from '#modules/documents/domain/files/file_constants'
import { getEditableFileDescriptor, type EditableFileDescriptor } from '#modules/documents/domain/files/editable_file_types'

export interface ResolvedFileEditFormat {
  sourceMimeType: AllowedMimeType
  outputMimeType: AllowedMimeType
  outputFileName: string
  descriptor: EditableFileDescriptor
  /** When true, the stored file bytes are unchanged; edits apply to searchable/preview text only. */
  preserveBinary: boolean
}

function fileExtension(originalName: string): string | null {
  const dot = originalName.lastIndexOf('.')
  if (dot <= 0) return null
  return originalName.slice(dot + 1).toLowerCase()
}

export function resolveEffectiveMimeType(mimeType: string, originalName: string): AllowedMimeType | null {
  const extension = fileExtension(originalName)
  const extensionMime = extension ? mimeFromExtension(extension) : null

  if (mimeType === 'text/plain' && extensionMime === 'text/csv') {
    return 'text/csv'
  }

  if (isAllowedMimeType(mimeType)) {
    return mimeType
  }

  return extensionMime
}

export function resolveFileEditFormat(file: {
  mimeType: string
  originalName: string
}): ResolvedFileEditFormat | null {
  const sourceMimeType = resolveEffectiveMimeType(file.mimeType, file.originalName)
  if (!sourceMimeType) return null

  const descriptor = getEditableFileDescriptor(sourceMimeType)
  if (!descriptor) return null

  const preserveBinary = descriptor.mode === 'extracted_text'

  return {
    sourceMimeType,
    outputMimeType: sourceMimeType,
    outputFileName: file.originalName,
    descriptor,
    preserveBinary,
  }
}

export function isFileEditable(file: { mimeType: string; originalName: string }): boolean {
  return resolveFileEditFormat(file) !== null
}
