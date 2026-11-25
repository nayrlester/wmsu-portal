type PersonLike = {
  fullName?: string | null
  name?: string | null
  lastName?: string | null
  firstName?: string | null
  email?: string | null
}

function scrub(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (/^undefined(\s*,\s*undefined)?$/i.test(text)) return ''
  if (/^null(\s*,\s*null)?$/i.test(text)) return ''
  return text
}

export function formatPersonDisplayName(
  person: PersonLike | null | undefined,
  empty = ''
): string {
  if (!person) return empty
  const full = scrub(person.fullName ?? person.name)
  if (full) return full
  const last = scrub(person.lastName)
  const first = scrub(person.firstName)
  if (last && first) return `${last}, ${first}`
  if (last) return last
  if (first) return first
  const email = scrub(person.email)
  if (email) return email
  return empty
}

export function formatFacultyDisplayNames(
  names: Array<string | null | undefined>,
  empty = 'No assigned faculty yet'
): string {
  const cleaned = [...new Set(names.map(scrub).filter(Boolean))]
  return cleaned.length ? cleaned.join('; ') : empty
}
