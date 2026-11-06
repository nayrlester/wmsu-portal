import { createNotifiedAxios } from '@/lib/notified-http'
import { getApiBaseUrl, getDefaultTenantSlug, type ApiResponse } from '@librastack/client-config'

export interface KioskCredentials {
  deviceCode: string
  apiKey: string
  tenantSlug?: string
}

function client(creds: KioskCredentials) {
  return createNotifiedAxios({
    baseURL: getApiBaseUrl(),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Tenant-Slug': creds.tenantSlug || getDefaultTenantSlug(),
      'X-Kiosk-Device-Code': creds.deviceCode,
      'X-Kiosk-Api-Key': creds.apiKey,
    },
  })
}

export async function kioskSession(creds: KioskCredentials) {
  const { data } = await client(creds).get<
    ApiResponse<{
      device: {
        name: string
        deviceCode: string
        location: string | null
        idleTimeoutSeconds: number
        isEnabled: boolean
      }
      serverTime: string
      features: Record<string, boolean>
    }>
  >('/kiosk/session')
  return data.data
}

export async function kioskHeartbeat(creds: KioskCredentials) {
  const { data } = await client(creds).post<ApiResponse<{ serverTime: string }>>('/kiosk/heartbeat')
  return data.data
}

export async function kioskPatron(creds: KioskCredentials, cardNumber: string) {
  const { data } = await client(creds).get<
    ApiResponse<{
      member: {
        id: string
        fullName: string
        libraryCardNumber: string
        membershipStatus: string
      }
      canBorrow: boolean
      activeLoanCount: number
      outstandingFineCount: number
      serverTime: string
    }>
  >('/kiosk/patron', { params: { cardNumber } })
  return data.data
}

export async function kioskAccount(creds: KioskCredentials, cardNumber: string) {
  const { data } = await client(creds).get<ApiResponse<Record<string, unknown>>>('/kiosk/account', {
    params: { cardNumber },
  })
  return data.data
}

export async function kioskHistory(creds: KioskCredentials, cardNumber: string) {
  const { data } = await client(creds).get<
    ApiResponse<{ items: Array<Record<string, unknown>>; serverTime: string }>
  >('/kiosk/history', { params: { cardNumber } })
  return data.data
}

export async function kioskCheckout(
  creds: KioskCredentials,
  payload: { cardNumber: string; copyBarcode: string }
) {
  const { data } = await client(creds).post<
    ApiResponse<{ borrowing: Record<string, unknown>; serverTime: string }>
  >('/kiosk/checkout', payload)
  return data.data
}

export async function kioskRenew(
  creds: KioskCredentials,
  payload: { cardNumber: string; copyBarcode: string }
) {
  const { data } = await client(creds).post<
    ApiResponse<{
      borrowing: {
        bookTitle?: string
        dueAt?: string | null
        renewalCount?: number
        maxRenewals?: number
      }
      serverTime: string
    }>
  >('/kiosk/renew', payload)
  return data.data
}

export async function kioskReturn(creds: KioskCredentials, copyBarcode: string) {
  const { data } = await client(creds).post<
    ApiResponse<{ borrowing: Record<string, unknown>; serverTime: string }>
  >('/kiosk/return', { copyBarcode })
  return data.data
}

export function getKioskApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
    if (message) return message
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message ?? 'Transaction failed')
  }
  if (error instanceof Error) return error.message
  return 'Transaction failed'
}
