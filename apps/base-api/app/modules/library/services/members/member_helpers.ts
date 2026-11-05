import { tenantContext } from '#modules/library/services/tenant/tenant_context'

export function memberTenantId(): string {
  return tenantContext.get().id
}

export function buildMemberSearchText(parts: {
  fullName: string
  email?: string | null
  contact?: string | null
  department?: string | null
  libraryCardNumber: string
  memberType: string
}): string {
  return [
    parts.fullName,
    parts.email,
    parts.contact,
    parts.department,
    parts.libraryCardNumber,
    parts.memberType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .trim()
}

export function generateLibraryCardNumber(tenantId: string, sequence: number): string {
  const prefix = tenantId.replace(/-/g, '').slice(0, 4).toUpperCase()
  return `LC-${prefix}-${String(sequence).padStart(6, '0')}`
}

export function buildQrPayload(tenantSlug: string, libraryCardNumber: string, memberId: string) {
  return JSON.stringify({
    type: 'librastack_member',
    tenant: tenantSlug,
    card: libraryCardNumber,
    id: memberId,
  })
}
