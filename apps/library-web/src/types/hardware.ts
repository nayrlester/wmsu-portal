export interface KioskDevice {
  id: string
  name: string
  deviceCode: string
  location: string | null
  isEnabled: boolean
  idleTimeoutSeconds: number
  config: Record<string, unknown> | null
  apiKeyPrefix: string | null
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string | null
  apiKey?: string
  serverTime?: string
}

export interface KioskTransaction {
  id: string
  kioskDeviceId: string
  memberId: string | null
  action: string
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface QueueTicket {
  id: string
  ticketNumber: string
  serviceType: string
  status: string
  calledAt: string | null
  createdAt: string
  patronName?: string | null
  memberId?: string | null
}

export interface ShelfLocation {
  id: string
  code: string
  label: string
  floor: string | null
  aisle: string | null
  shelf: string | null
  mapCoordinates: Record<string, unknown> | null
}

export interface LocateResult {
  copyId: string
  barcode: string
  shelfLocation: string | null
  status: string
  bookTitle?: string
  available: boolean
}

export interface UpsertKioskPayload {
  name: string
  deviceCode: string
  location?: string
  isEnabled?: boolean
  idleTimeoutSeconds?: number
  rotateApiKey?: boolean
}
