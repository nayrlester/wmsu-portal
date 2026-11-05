export type PlanType = 'app' | 'wfp'
export type DocumentType = 'annual' | 'supplemental' | 'realignment' | 'adjustment'
export type WorkflowStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type ObligationKind = 'ors' | 'burs' | 'other'

export interface FinancialPlan {
  id: string
  planType: PlanType
  fiscalYear: string
  title: string
  description?: string | null
  status: WorkflowStatus
  lines?: FinancialPlanLine[]
  rejectionReason?: string | null
  createdAt?: string
}

export interface FinancialPlanLine {
  id?: string
  lineNo?: number
  description: string
  fundId?: string | null
  accountId?: string | null
  amount: string | number
  remarks?: string | null
}

export interface BudgetDocument {
  id: string
  documentType: DocumentType
  fiscalYear: string
  title: string
  description?: string | null
  status: WorkflowStatus
  lines?: BudgetDocumentLine[]
  rejectionReason?: string | null
  createdAt?: string
}

export interface BudgetDocumentLine {
  id?: string
  lineNo?: number
  fundId: string
  accountId: string
  uacsCode?: string | null
  effect?: 'increase' | 'decrease'
  amount: string | number
  remarks?: string | null
}

export interface BudgetObligation {
  id: string
  documentKind: ObligationKind
  documentNumber: string
  fiscalYear: string
  fundId: string
  accountId: string
  amount: string | number
  particulars?: string | null
  status: 'draft' | 'posted' | 'cancelled'
  createdAt?: string
}

export interface BudgetMonitorLine {
  id: string
  fundCode: string | null
  accountCode: string | null
  uacsCode: string | null
  allocatedAmount: string
  obligatedAmount: string
  utilizedAmount: string
  availableAmount: string
  calculation: string
}

export interface BudgetMonitor {
  fiscalYear: string
  lines: BudgetMonitorLine[]
  totals: {
    allocatedAmount: string
    obligatedAmount: string
    utilizedAmount: string
    availableAmount: string
  }
  tor: string[]
}

export interface FundOption {
  id: string
  fundCode: string
  fundName: string
}

export interface AccountOption {
  id: string
  accountCode: string
  accountTitle: string
  uacsCode?: string | null
}
