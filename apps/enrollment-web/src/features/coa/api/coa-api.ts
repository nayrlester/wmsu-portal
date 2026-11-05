import { apiClient } from '@/lib/api-client'
import type { CoaForm, CoaFormDetail, CoaFormData, CoaFormType } from '../types'

interface ListParams {
  formType?: CoaFormType | string
  status?: string
  search?: string
  page?: number
  limit?: number
}

function mapCoa(row: Record<string, unknown>): CoaForm {
  const payload = (row.payload as Record<string, unknown> | undefined) ?? {}
  return {
    id: String(row.id ?? ''),
    formType: String(row.formType ?? row.form_type ?? 'ICS') as CoaForm['formType'],
    number: String(row.documentNo ?? row.document_no ?? row.number ?? row.formNumber ?? ''),
    title: String(payload.title ?? row.title ?? row.formType ?? row.form_type ?? ''),
    custodian: String(
      row.custodianName ?? row.custodian_name ?? row.custodian ?? payload.custodian ?? ''
    ),
    office: String(row.officeId ?? row.office_id ?? row.office ?? payload.office ?? ''),
    status: String(row.status ?? 'draft') as CoaForm['status'],
    totalAmount: Number(row.totalAmount ?? row.total_amount ?? payload.totalAmount ?? 0),
    itemCount: Number(row.itemCount ?? row.item_count ?? (row.lines as unknown[])?.length ?? 0),
    createdAt: String(row.createdAt ?? row.created_at ?? row.documentDate ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

function mapDetail(row: Record<string, unknown>): CoaFormDetail {
  const linesRaw = (row.lines as Record<string, unknown>[] | undefined) ?? []
  return {
    ...mapCoa(row),
    remarks: String(row.remarks ?? ''),
    lines: linesRaw.map((l) => ({
      id: String(l.id ?? ''),
      description: String(l.description ?? ''),
      quantity: Number(l.quantity ?? 0),
      unitCost: Number(l.unitCost ?? l.unit_cost ?? 0),
      amount: Number(l.amount ?? Number(l.quantity ?? 0) * Number(l.unitCost ?? l.unit_cost ?? 0)),
      propertyNumber: String(l.propertyNumber ?? l.property_number ?? ''),
    })),
  }
}

export async function fetchCoaForms(
  params: ListParams = {}
): Promise<{ data: CoaForm[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/coa', { params })
  const rows = (data.data ?? []).map(mapCoa)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function fetchCoaForm(id: string): Promise<CoaFormDetail> {
  const { data } = await apiClient.get(`/coa/${id}`)
  return mapDetail(data.data ?? data)
}

export async function createCoaForm(payload: CoaFormData): Promise<CoaForm> {
  const { data } = await apiClient.post('/coa', {
    formType: payload.formType,
    documentDate: payload.documentDate || new Date().toISOString().slice(0, 10),
    custodianName: payload.custodian || undefined,
    payload: {
      title: payload.title,
      office: payload.office,
      remarks: payload.remarks,
    },
    lines: payload.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitCost: l.unitCost,
      totalCost: l.quantity * l.unitCost,
      propertyNumber: l.propertyNumber,
    })),
  })
  return mapCoa(data.data ?? data)
}

export async function approveCoaForm(id: string): Promise<CoaForm> {
  const { data } = await apiClient.post(`/coa/${id}/approve`)
  return mapCoa(data.data ?? data)
}

export async function exportCoaForm(id: string, format: 'csv' = 'csv'): Promise<Blob> {
  const { data } = await apiClient.get(`/coa/${id}/export`, {
    params: { format },
    responseType: 'blob',
  })
  return data
}
