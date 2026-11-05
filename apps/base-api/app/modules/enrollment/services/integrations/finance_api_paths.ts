import env from '#start/env'
export { resolveFinanceOrganizationId } from '#modules/finance/services/ufms/resolve_organization_id'

export function financeApiBaseUrl(): string {
  return (env.get('FINANCE_API_URL') ?? 'http://127.0.0.1:3500').replace(/\/$/, '')
}

export function financeInternalPath(suffix: string): string {
  const prefix =
    (env.get('FINANCE_INTERNAL_PREFIX') as string | undefined)?.replace(/\/$/, '') ??
    '/api/v1/finance/internal'
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`
  return `${financeApiBaseUrl()}${prefix}${path}`
}
