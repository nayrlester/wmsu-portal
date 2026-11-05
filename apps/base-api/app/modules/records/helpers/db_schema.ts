export function dbSchema() {
  return 'records'
}

export function t(table: string) {
  const [name, alias] = table.split(/\s+as\s+/i)
  const qualified = `${dbSchema()}.${name!.trim()}`
  return alias ? `${qualified} as ${alias.trim()}` : qualified
}
