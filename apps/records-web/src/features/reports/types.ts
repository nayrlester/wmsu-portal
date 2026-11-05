export type ReportType = 'stock-inventory' | 'property-ledger' | 'consumption' | 'depreciation'

export interface ReportDefinition {
  id: ReportType
  title: string
  description: string
}
