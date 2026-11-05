export type ReportType =
  | 'trial-balance'
  | 'financial-position'
  | 'budget-vs-actual'
  | 'receivables-aging'
  | 'saob'
  | 'audit-export'
  | 'bfar'
  | 'bir-withholding'
  | 'agency-ebudget'
  | 'agency-btms'
  | 'agency-engas'

export interface ReportDefinition {
  id: ReportType
  title: string
  description: string
  path: string
  kind: 'json' | 'html' | 'csv'
}
