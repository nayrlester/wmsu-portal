export const DOCUMENT_COMPLIANCE = {
  STRUCTURED_ONLY: 'structured_only',
} as const

export const DOCUMENT_SIGNATURE = {
  NOT_APPLIED: 'not_applied',
} as const

export const ISSUANCE_STATUSES = ['draft', 'issued'] as const
export type IssuanceStatus = (typeof ISSUANCE_STATUSES)[number]

export const TOR_COPY_TYPES = ['student', 'official'] as const
export type TorCopyType = (typeof TOR_COPY_TYPES)[number]

export function isTorCopyType(value: string): value is TorCopyType {
  return (TOR_COPY_TYPES as readonly string[]).includes(value)
}

export function isIssuanceStatus(value: string): value is IssuanceStatus {
  return (ISSUANCE_STATUSES as readonly string[]).includes(value)
}

export function newIssuanceSerial(kind: 'TOR' | 'CERT') {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${kind}ISS-${day}-${suffix}`
}

export function newVerificationCode() {
  const a = Math.random().toString(36).slice(2, 10).toUpperCase()
  const b = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `VR-${a}${b}`
}

export const STRUCTURED_DOCUMENT_DISCLAIMER =
  'Structured academic payload only. Official University print layout, watermark, and signatory assets are For Clarification (FC #1). This artifact is not an officially printed WMSU transcript or certification until an approved template and signing process are applied.'
