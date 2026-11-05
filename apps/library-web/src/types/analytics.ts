export interface AnalyticsOverview {
  totalBooks: number
  totalCopies: number
  availableCopies: number
  activeMembers: number
  activeLoans: number
  overdue: number
  activeReservations: number
  checkoutsThisMonth: number
  returnsThisMonth: number
  attendanceToday?: number
}

export interface CirculationTrendPoint {
  date: string
  checkouts: number
  returns: number
  reservations: number
}

export interface TopBook {
  bookId: string
  title: string
  authorNames: string | null
  loanCount: number
  activeLoans: number
}

export interface SubjectStat {
  subject: string
  titleCount: number
}

export interface MaterialTypeStat {
  materialType: string
  titleCount: number
}

export interface SearchTermStat {
  query: string
  searchCount: number
}

export interface PeakUsageHour {
  hour: number
  eventCount: number
}

export interface AcquisitionSummary {
  total: number
  byStatus: Record<string, number>
  pendingRoute: number
  routed: number
  cataloged: number
}

export interface DigitalUsageSummary {
  itemCount: number
  downloadTotal: number
  viewTotal: number
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview
  circulationTrends: CirculationTrendPoint[]
  topBooks: TopBook[]
  statusBreakdown: Record<string, number>
  subjectStats?: SubjectStat[]
  materialTypeStats?: MaterialTypeStat[]
  topSearchTerms?: SearchTermStat[]
  peakUsageHours?: PeakUsageHour[]
  acquisitionSummary?: AcquisitionSummary
  digitalUsageSummary?: DigitalUsageSummary
  period: {
    days: number
    from: string
    to: string
  }
}
