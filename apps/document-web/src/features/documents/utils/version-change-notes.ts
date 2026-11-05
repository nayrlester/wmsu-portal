const AUTO_FILE_EDIT_NOTE = /^Edited ".+" in browser$/

/** Hide system-generated edit notes; keep user-authored version notes. */
export function shouldShowVersionChangeNotes(changeNotes: string | null | undefined): boolean {
  if (!changeNotes?.trim()) return false
  return !AUTO_FILE_EDIT_NOTE.test(changeNotes.trim())
}
