/** University ULMIS money display — Philippine Peso (centavos stored as cents). */

export const CURRENCY_CODE = 'PHP'
export const CURRENCY_LOCALE = 'en-PH'

export function formatMoneyFromCents(cents: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
  }).format(cents / 100)
}
