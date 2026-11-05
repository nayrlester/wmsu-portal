/** User-facing tracking statuses from TOR-027 (shared with transcript requests). */
export const CERT_REQUEST_STATUSES = ['pending', 'processing', 'approved', 'released'] as const

export type CertRequestStatus = (typeof CERT_REQUEST_STATUSES)[number]

/** Prompt 04 processing workflow; generation/issuance (released) deferred to Prompt 05. */
export const CERT_REQUEST_TRANSITIONS: Record<CertRequestStatus, CertRequestStatus[]> = {
  pending: ['processing'],
  processing: ['approved'],
  approved: ['released'],
  released: [],
}

export const CERT_LOCALITIES = ['local', 'foreign'] as const
export type CertLocality = (typeof CERT_LOCALITIES)[number]

export function isCertRequestStatus(value: string): value is CertRequestStatus {
  return (CERT_REQUEST_STATUSES as readonly string[]).includes(value)
}

export function canTransitionCertRequest(from: CertRequestStatus, to: CertRequestStatus): boolean {
  return CERT_REQUEST_TRANSITIONS[from].includes(to)
}
