export function toCents(value: string | number): bigint {
  const raw =
    typeof value === 'number'
      ? value.toFixed(8)
      : String(value).trim().replace(/,/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw Object.assign(new Error('Invalid monetary amount'), { status: 422 })
  }
  const negative = raw.startsWith('-')
  const unsigned = raw.replace(/^-/, '')
  const [whole, frac = ''] = unsigned.split('.')
  const digits = `${frac}000`.slice(0, 3)
  let cents = BigInt(whole) * 100n + BigInt(digits.slice(0, 2))
  if (digits[2] >= '5') cents += 1n
  return negative ? -cents : cents
}

export function fromCents(cents: bigint): string {
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  const whole = abs / 100n
  const frac = (abs % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${whole.toString()}.${frac}`
}

export function addMoney(a: string | number, b: string | number): string {
  return fromCents(toCents(a) + toCents(b))
}

export function subMoney(a: string | number, b: string | number): string {
  return fromCents(toCents(a) - toCents(b))
}

export function cmpMoney(a: string | number, b: string | number): number {
  const diff = toCents(a) - toCents(b)
  if (diff === 0n) return 0
  return diff > 0n ? 1 : -1
}
