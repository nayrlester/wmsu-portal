import { tenantContext } from '#modules/library/services/tenant/tenant_context'

export function searchTenantId(): string {
  return tenantContext.get().id
}

export type SearchPreset = 'available' | 'overdue' | 'most_borrowed' | 'new_arrivals'

export type SearchEntityType = 'book' | 'member' | 'transaction'

export function buildDocumentVector(parts: string[]): string {
  return parts.filter(Boolean).join(' ')
}
