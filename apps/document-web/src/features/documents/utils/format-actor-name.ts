export function formatActorName(
  user?: { fullName?: string | null; email?: string } | null
): string {
  if (!user) return '—'
  return user.fullName?.trim() || user.email || '—'
}
