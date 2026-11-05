export const ALLOWED_MIME_TYPES = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'text/plain': ['txt'],
  'text/csv': ['csv'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
} as const

export type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES

export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_MIME_TYPES).flat()

/** OOXML (.docx/.xlsx/.pptx) are ZIP containers; magic-byte sniffers often report "zip". */
export const OOXML_EXTENSIONS = ['docx', 'xlsx', 'pptx'] as const

const ZIP_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
])

export const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
export const DEFAULT_SIGNED_URL_EXPIRES_SECONDS = 900

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return mimeType in ALLOWED_MIME_TYPES
}

export function normalizeExtension(extension: string): string {
  return extension.toLowerCase().replace(/^\./, '')
}

export function isOoxmlExtension(extension: string): boolean {
  return (OOXML_EXTENSIONS as readonly string[]).includes(normalizeExtension(extension))
}

export function isZipMimeType(mimeType: string | undefined): boolean {
  return Boolean(mimeType && ZIP_MIME_TYPES.has(mimeType.toLowerCase()))
}

/**
 * Prefer the client filename extension when magic-byte detection collapses OOXML to "zip".
 */
export function resolveUploadExtension(input: {
  clientName?: string | null
  magicExtname?: string | null
}): string {
  const fromClient = input.clientName?.includes('.')
    ? normalizeExtension(input.clientName.split('.').pop() ?? '')
    : ''
  const fromMagic = input.magicExtname ? normalizeExtension(input.magicExtname) : ''

  if (fromMagic === 'zip' && isOoxmlExtension(fromClient)) {
    return fromClient
  }

  // Prefer a known allowed client extension over an unknown/empty magic result
  if (fromClient && mimeFromExtension(fromClient)) {
    return fromClient
  }

  return fromMagic || fromClient
}

export function mimeFromExtension(extension: string): AllowedMimeType | null {
  const ext = normalizeExtension(extension)
  for (const [mime, extensions] of Object.entries(ALLOWED_MIME_TYPES)) {
    if ((extensions as readonly string[]).includes(ext)) {
      return mime as AllowedMimeType
    }
  }
  return null
}

export function resolveMimeType(mimeType: string | undefined, extension: string): AllowedMimeType | null {
  const extMime = mimeFromExtension(extension)

  if (!mimeType || mimeType === 'application/octet-stream') {
    return extMime
  }

  // Browsers often label .csv as text/plain
  if (mimeType === 'text/plain' && extMime === 'text/csv') {
    return 'text/csv'
  }

  // Magic sniffers (file-type / Adonis) report OOXML as application/zip
  if (isZipMimeType(mimeType) && extMime && isOoxmlExtension(extension)) {
    return extMime
  }

  if (isAllowedMimeType(mimeType)) {
    return mimeType
  }

  return extMime
}

export function isExtensionAllowedForMime(mimeType: string, extension: string): boolean {
  const allowed = ALLOWED_MIME_TYPES[mimeType as AllowedMimeType]
  if (!allowed) return false
  const ext = normalizeExtension(extension)
  return (allowed as readonly string[]).includes(ext)
}
