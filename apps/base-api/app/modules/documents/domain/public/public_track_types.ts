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
