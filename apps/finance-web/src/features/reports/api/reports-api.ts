import { apiClient } from '@/lib/api-client'
import type { ReportType } from '../types'

export async function fetchReportJson(type: ReportType, params?: Record<string, string>) {
  const pathByType: Record<string, string> = {
    'trial-balance': '/reports/trial-balance',
    'financial-position': '/reports/financial-position',
    'budget-vs-actual': '/reports/budget-vs-actual',
    'receivables-aging': '/reports/receivables-aging',
    saob: '/reports/saob',
    'audit-export': '/reports/audit-export',
  }
  const path = pathByType[type]
  if (!path) throw new Error(`Unsupported JSON report: ${type}`)
  const { data } = await apiClient.get(path, { params })
  return data.data ?? data
}

export async function downloadBinaryReport(
  path: string,
  filename: string,
  params?: Record<string, string>
) {
  const { data } = await apiClient.get(path, { params, responseType: 'blob' })
  const blob = data instanceof Blob ? data : new Blob([data])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function triggerJsonDownload(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function runOfficialExport(type: ReportType, fiscalYear?: string) {
  const year = fiscalYear || String(new Date().getFullYear())
  if (type === 'bfar') {
    await downloadBinaryReport('/official/bfar', `bfar-bed-${year}.html`, { fiscalYear: year })
    return
  }
  if (type === 'bir-withholding') {
    await downloadBinaryReport('/official/bir/withholding', `bir-withholding-${year}.csv`)
    return
  }
  if (type === 'agency-ebudget') {
    await downloadBinaryReport('/reports/agency/ebudget/csv', `dbm-ebudget-${year}.csv`)
    return
  }
  if (type === 'agency-btms') {
    await downloadBinaryReport('/reports/agency/btms/csv', `dbm-btms-${year}.csv`)
    return
  }
  if (type === 'agency-engas') {
    await downloadBinaryReport('/reports/agency/engas/csv', `coa-engas-${year}.csv`)
    return
  }
  const payload = await fetchReportJson(type, { fiscalYear: year })
  triggerJsonDownload(payload, `${type}-${year}.json`)
}
