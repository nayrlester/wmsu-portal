export type CoaFormType = 'ICS' | 'PAR' | 'RPCPPE' | 'IIRUP' | 'WMR'

export type CoaStatus = 'draft' | 'pending' | 'approved' | 'cancelled'

export interface CoaForm {
  id: string
  formType: CoaFormType
  number: string
  title: string
  custodian: string
  office: string
  status: CoaStatus
  totalAmount: number
  itemCount: number
  createdAt: string
  updatedAt: string
}

export interface CoaFormDetail extends CoaForm {
  lines: Array<{
    id: string
    description: string
    quantity: number
    unitCost: number
    amount: number
    propertyNumber?: string
  }>
  remarks: string
}

export interface CoaFormData {
  formType: CoaFormType
  title: string
  custodian: string
  office: string
  documentDate?: string
  remarks?: string
  lines: Array<{
    description: string
    quantity: number
    unitCost: number
    propertyNumber?: string
  }>
}
