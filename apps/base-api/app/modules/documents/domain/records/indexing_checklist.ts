export type IndexingChecklistItem = {
  key: string
  label: string
  done: boolean
}

export const DEFAULT_INDEXING_CHECKLIST: IndexingChecklistItem[] = [
  { key: 'legible', label: 'Scan is legible', done: false },
  { key: 'complete', label: 'All pages captured', done: false },
  { key: 'oriented', label: 'Pages correctly oriented', done: false },
  { key: 'indexed', label: 'Title / keywords indexed', done: false },
  { key: 'linked', label: 'Physical box / folder linked', done: false },
]

export function mergeChecklist(
  incoming?: Array<{ key: string; done: boolean }> | null
): IndexingChecklistItem[] {
  if (!incoming?.length) return DEFAULT_INDEXING_CHECKLIST.map((i) => ({ ...i }))
  return DEFAULT_INDEXING_CHECKLIST.map((base) => {
    const hit = incoming.find((i) => i.key === base.key)
    return { ...base, done: hit?.done ?? base.done }
  })
}
