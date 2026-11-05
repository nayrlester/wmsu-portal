const EDITABLE_VERSION_STATUSES = new Set(['draft', 'returned'])
const BRANCH_FROM_VERSION_STATUSES = new Set(['draft', 'returned', 'rejected'])

export function isEditableVersionStatus(status?: string): boolean {
  return EDITABLE_VERSION_STATUSES.has(status ?? 'draft')
}

export function canBranchVersionFrom(status?: string): boolean {
  return BRANCH_FROM_VERSION_STATUSES.has(status ?? '')
}

export function canModifyVersionFile(
  versionStatus: string | undefined,
  hasUpdatePermission: boolean
): boolean {
  if (!hasUpdatePermission) return false
  return isEditableVersionStatus(versionStatus) || canBranchVersionFrom(versionStatus)
}

export function canDeleteVersionFile(
  versionStatus: string | undefined,
  canDelete: boolean
): boolean {
  if (!canDelete) return false
  return isEditableVersionStatus(versionStatus)
}

/** Content edit / upload when the parent page says the document status is modifiable. */
export function canManageDocumentDrafts(canEdit: boolean, canSubmit = false): boolean {
  return canEdit || canSubmit
}

/**
 * Show Add file / create-version when drafts are manageable and at least one
 * version can be edited in place or branched from (draft / returned / rejected),
 * including versions that already have files.
 */
export function shouldShowFileUploadZone(
  canManageDrafts: boolean,
  versions: Array<{ status: string; files: unknown[] }>
): boolean {
  if (!canManageDrafts) return false
  return versions.some(
    (version) => isEditableVersionStatus(version.status) || canBranchVersionFrom(version.status)
  )
}
