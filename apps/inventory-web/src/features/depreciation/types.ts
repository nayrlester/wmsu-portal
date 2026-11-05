export interface DepreciationProfile {
  id: string
  assetId: string
  assetCode: string
  assetName: string
  method: string
  usefulLifeMonths: number
  residualRate: number
  acquisitionCost: number
  inServiceDate: string
  accumDepr: number
  bookValue: number
  active: boolean
  createdAt: string
}

export interface DepreciationProfileFormData {
  assetId: string
  method: 'straight_line'
  usefulLifeMonths: number
  residualRate: number
  acquisitionCost: number
  inServiceDate: string
}

export interface DepreciationRunPayload {
  periodYear: number
  periodMonth: number
  assetId?: string
}

export interface LapsingScheduleRow {
  id: string
  periodYear: number
  periodMonth: number
  deprAmount: number
  accumDepr: number
  bookValue: number
  posted: boolean
}

export interface LapsingScheduleResult {
  profile: DepreciationProfile
  schedule: LapsingScheduleRow[]
}

export interface PropertyLedgerEntry {
  id: string
  assetId: string
  assetCode: string
  assetName: string
  entryType: string
  reference: string
  debit: number
  credit: number
  balanceAfter: number
  narrative: string
  occurredAt: string
}
