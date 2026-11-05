import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Presentation,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type DocumentFileIconKind =
  | 'pdf'
  | 'word'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'text'
  | 'video'
  | 'audio'
  | 'archive'
  | 'editor'
  | 'generic'

export interface DocumentFileIconInput {
  mimeType?: string | null
  originalName?: string | null
}

export interface DocumentIconInput extends DocumentFileIconInput {
  sourceType?: 'upload' | 'editor' | 'mixed' | string | null
  hasContent?: boolean
  primaryFile?: DocumentFileIconInput | null
}

const ICON_BY_KIND: Record<DocumentFileIconKind, LucideIcon> = {
  pdf: FileText,
  word: FileType,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  image: FileImage,
  text: FileText,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  editor: FilePenLine,
  generic: File,
}

const COLOR_BY_KIND: Record<DocumentFileIconKind, string> = {
  pdf: 'text-red-600 dark:text-red-400',
  word: 'text-blue-600 dark:text-blue-400',
  spreadsheet: 'text-emerald-600 dark:text-emerald-400',
  presentation: 'text-orange-600 dark:text-orange-400',
  image: 'text-violet-600 dark:text-violet-400',
  text: 'text-muted-foreground',
  video: 'text-sky-600 dark:text-sky-400',
  audio: 'text-fuchsia-600 dark:text-fuchsia-400',
  archive: 'text-amber-700 dark:text-amber-400',
  editor: 'text-primary',
  generic: 'text-muted-foreground',
}

function extensionOf(name?: string | null): string {
  if (!name) return ''
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index + 1).toLowerCase() : ''
}

export function resolveFileIconKind({ mimeType, originalName }: DocumentFileIconInput): DocumentFileIconKind {
  const mime = mimeType?.toLowerCase() ?? ''
  const extension = extensionOf(originalName)

  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf'

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)
  ) {
    return 'image'
  }

  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv' ||
    ['xls', 'xlsx', 'csv'].includes(extension)
  ) {
    return 'spreadsheet'
  }

  if (
    mime.includes('wordprocessing') ||
    mime === 'application/msword' ||
    ['doc', 'docx'].includes(extension)
  ) {
    return 'word'
  }

  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['ppt', 'pptx'].includes(extension)
  ) {
    return 'presentation'
  }

  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi'].includes(extension)) return 'video'
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return 'audio'

  if (
    mime.includes('zip') ||
    mime.includes('archive') ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)
  ) {
    return 'archive'
  }

  if (mime.startsWith('text/') || ['txt', 'md', 'json', 'xml'].includes(extension)) return 'text'

  return 'generic'
}

export function resolveDocumentIconKind(input: DocumentIconInput): DocumentFileIconKind {
  const file = input.primaryFile ?? input
  if (file.mimeType || file.originalName) {
    return resolveFileIconKind(file)
  }

  if (input.sourceType === 'editor' || (input.hasContent && input.sourceType !== 'upload')) {
    return 'editor'
  }

  return 'generic'
}

export function getDocumentFileIconMeta(input: DocumentIconInput) {
  const kind = resolveDocumentIconKind(input)
  return {
    kind,
    Icon: ICON_BY_KIND[kind],
    className: COLOR_BY_KIND[kind],
  }
}

interface DocumentFileIconProps extends DocumentIconInput {
  className?: string
  sizeClassName?: string
}

export function DocumentFileIcon({
  className,
  sizeClassName = 'h-5 w-5',
  ...input
}: DocumentFileIconProps) {
  const { Icon, className: colorClassName } = getDocumentFileIconMeta(input)
  return <Icon className={cn(sizeClassName, colorClassName, className)} aria-hidden />
}
