import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'

export interface RfidTagRow {
  id: string
  tagUid: string
  copyId: string | null
  status: string
  registeredAt: string | null
  barcode: string | null
  bookTitle: string | null
  copyStatus: string | null
}

export interface RfidTransaction {
  borrowing: {
    transactionNumber?: string
    status?: string
  }
  copyStatus: string
  barcode: string
  bookTitle: string | null
}

export async function fetchRfidTags() {
  const { data } = await apiClient.get<ApiResponse<RfidTagRow[]>>('/hardware/rfid')
  return data.data
}

export async function registerRfidTag(payload: { tagUid: string; copyBarcode: string }) {
  const { data } = await apiClient.post<ApiResponse<RfidTagRow>>('/hardware/rfid', payload)
  return data.data
}

export async function rfidCheckout(payload: { tagUid: string; cardNumber: string }) {
  const { data } = await apiClient.post<ApiResponse<RfidTransaction>>('/hardware/rfid/checkout', payload)
  return data.data
}

export interface RfidGateEvent {
  id: string
  gateCode: string
  tagUid: string
  result: string
  reason: string
  createdAt: string | null
  barcode?: string | null
  bookTitle?: string | null
  copyStatus?: string | null
}

export async function readRfidGate(payload: { tagUid: string; gateCode: string }) {
  const { data } = await apiClient.post<ApiResponse<RfidGateEvent>>('/hardware/rfid/gate', payload)
  return data.data
}

export async function fetchRfidGateEvents() {
  const { data } = await apiClient.get<ApiResponse<RfidGateEvent[]>>('/hardware/rfid/gate')
  return data.data
}

export interface ShelfCountSummary {
  id: string
  shelfCode: string
  createdAt: string | null
  seenCount: number
  missingCount: number
  elsewhereCount: number
  unknownCount: number
}

export async function fetchShelfCounts() {
  const { data } = await apiClient.get<ApiResponse<ShelfCountSummary[]>>('/hardware/inventory/counts')
  return data.data
}

export async function fetchShelfCount(countId: string) {
  const { data } = await apiClient.get<ApiResponse<ShelfCountReport>>(`/hardware/inventory/counts/${countId}`)
  return data.data
}

export async function startShelfCount(shelfCode: string) {
  const { data } = await apiClient.post<ApiResponse<ShelfCountReport>>('/hardware/inventory/counts', {
    shelfCode,
  })
  return data.data
}

export async function addShelfScan(countId: string, value: string) {
  const { data } = await apiClient.post<ApiResponse<ShelfCountReport>>(
    `/hardware/inventory/counts/${countId}/scans`,
    { value }
  )
  return data.data
}

export interface ShelfCountCopy {
  copyId: string
  barcode: string
  bookTitle: string | null
  copyStatus: string
  shelfLocation?: string | null
}

export interface ShelfCountReport {
  id: string
  shelfCode: string
  seen: ShelfCountCopy[]
  missing: ShelfCountCopy[]
  elsewhere: ShelfCountCopy[]
  unknown: string[]
}

export async function rfidCheckin(tagUid: string) {
  const { data } = await apiClient.post<ApiResponse<RfidTransaction>>('/hardware/rfid/checkin', {
    tagUid,
  })
  return data.data
}
