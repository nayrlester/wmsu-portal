export function isDocumentOwner(
  documentOwnerId: string | undefined,
  currentUserId: string | undefined
): boolean {
  if (!documentOwnerId || !currentUserId) return false
  return documentOwnerId === currentUserId
}

export function canViewDocumentVersion(
  versionStatus: string | undefined,
  documentOwnerId: string | undefined,
  currentUserId: string | undefined,
  versionCreatedById?: string | null
): boolean {
  if (versionStatus !== 'draft') return true
  if (isDocumentOwner(documentOwnerId, currentUserId)) return true
  if (versionCreatedById && currentUserId && versionCreatedById === currentUserId) return true
  return false
}

export function filterVisibleDocumentVersions<
  T extends { status: string; createdBy?: { id: string } | null },
>(
  versions: T[],
  documentOwnerId: string | undefined,
  currentUserId: string | undefined
): T[] {
  return versions.filter((version) =>
    canViewDocumentVersion(
      version.status,
      documentOwnerId,
      currentUserId,
      version.createdBy?.id
    )
  )
}
