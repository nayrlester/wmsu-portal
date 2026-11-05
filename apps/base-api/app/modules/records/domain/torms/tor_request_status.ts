/** User-facing tracking statuses from TOR-027. Do not invent additional public statuses. */
export const TOR_REQUEST_STATUSES = ['pending', 'processing', 'approved', 'released'] as const

export type TorRequestStatus = (typeof TOR_REQUEST_STATUSES)[number]

/** Permitted transitions for Prompt 03 request workflow (generation/issuance deferred). */
export const TOR_REQUEST_TRANSITIONS: Record<TorRequestStatus, TorRequestStatus[]> = {
  pending: ['processing'],
  processing: ['approved'],
  approved: ['released'],
  released: [],
}

export const FIRST_REQUEST_TAG = 'First Request - With Physical Document Requirement'

export const TOR_LOCALITIES = ['local', 'foreign'] as const
export type TorLocality = (typeof TOR_LOCALITIES)[number]

export function isTorRequestStatus(value: string): value is TorRequestStatus {
  return (TOR_REQUEST_STATUSES as readonly string[]).includes(value)
}

export function canTransitionTorRequest(from: TorRequestStatus, to: TorRequestStatus): boolean {
  return TOR_REQUEST_TRANSITIONS[from].includes(to)
}
