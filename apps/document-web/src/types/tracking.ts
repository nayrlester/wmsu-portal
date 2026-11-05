export interface PublicTrackDepartment {
  name: string
}

export interface PublicTrackTimelineEntry {
  action: string
  label: string
  department: PublicTrackDepartment | null
  occurredAt: string
}

export interface PublicTrackView {
  trackingNumber: string
  title: string
  status: string
  currentDepartment: PublicTrackDepartment | null
  lastUpdated: string
  submittedAt: string | null
  timeline: PublicTrackTimelineEntry[]
}

export interface DocumentSummary {
  id: string
  trackingNumber: string
  trackUrl?: string
  qrCodeUrl?: string | null
  title: string
  description?: string | null
  status: string
  priority: string
  department?: { id: string; name: string; code: string } | null
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
}
