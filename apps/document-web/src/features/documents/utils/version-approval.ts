export const APPROVABLE_VERSION_STATUSES = new Set([
  'pending_approval',
  'pending_review',
  'submitted',
])

export function canShowVersionApproval(
  versionStatus: string | undefined,
  canApprove: boolean,
  canActOnVersionApproval: boolean
): boolean {
  if (!canApprove || !canActOnVersionApproval) return false
  if (!APPROVABLE_VERSION_STATUSES.has(versionStatus ?? '')) return false
  return true
}
