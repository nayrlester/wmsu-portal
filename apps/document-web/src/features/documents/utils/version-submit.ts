const SUBMITTABLE_VERSION_STATUSES = new Set(['draft', 'returned'])

export function canSubmitVersion(
  versionStatus: string | undefined,
  canSubmit: boolean
): boolean {
  if (!canSubmit) return false
  return SUBMITTABLE_VERSION_STATUSES.has(versionStatus ?? 'draft')
}
