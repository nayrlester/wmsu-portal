import { apiClient } from '@/lib/api-client'

export type FeeScheduleLineInput = {
  feeCode: string
  description: string
  feeType: 'tuition' | 'miscellaneous' | 'laboratory' | 'other'
  calculationMethod: 'fixed' | 'per_unit' | 'per_subject'
  amount: number
  subjectCode?: string
  priority?: number
}

export async function fetchTuitionFeeScheduleScope() {
  const { data } = await apiClient.get('/tuition/fee-schedule-scope')
  return (data.data ?? data) as {
    academicYears: Array<{ id: string; code: string; name: string }>
    programs: Array<{ id: string; code: string; name: string }>
    classifications: Array<{ value: string; label: string }>
  }
}

export async function fetchTuitionFeeSchedules() {
  const { data } = await apiClient.get('/tuition/fee-schedules')
  return (data.data ?? data) as Array<Record<string, unknown>>
}

export async function upsertTuitionFeeSchedule(body: {
  code: string
  name: string
  academicYearId?: string
  semester?: number
  classification?: string
  programId?: string
  lines: FeeScheduleLineInput[]
}) {
  const { data } = await apiClient.post('/tuition/fee-schedules', body)
  return data.data ?? data
}

export async function updateTuitionFeeSchedule(
  scheduleId: string,
  body: {
    code: string
    name: string
    academicYearId?: string
    semester?: number
    classification?: string
    programId?: string
    lines: FeeScheduleLineInput[]
  }
) {
  const { data } = await apiClient.put(`/tuition/fee-schedules/${scheduleId}`, body)
  return data.data ?? data
}

export async function deactivateTuitionFeeSchedule(scheduleId: string) {
  const { data } = await apiClient.delete(`/tuition/fee-schedules/${scheduleId}`)
  return data.data ?? data
}

export async function fetchPaymentPlanTemplates() {
  const { data } = await apiClient.get('/tuition/payment-plans')
  return (data.data ?? data) as Array<Record<string, unknown>>
}

export async function upsertPaymentPlanTemplate(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/tuition/payment-plans', body)
  return data.data ?? data
}

export async function updatePaymentPlanTemplate(templateId: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`/tuition/payment-plans/${templateId}`, body)
  return data.data ?? data
}

export async function deactivatePaymentPlanTemplate(templateId: string) {
  const { data } = await apiClient.delete(`/tuition/payment-plans/${templateId}`)
  return data.data ?? data
}

export async function fetchEnrollmentPaymentPolicy() {
  const { data } = await apiClient.get('/tuition/payment-policy')
  return data.data ?? data
}

export async function upsertEnrollmentPaymentPolicy(body: {
  minimumDueMode: 'full_net' | 'first_installment' | 'downpayment_percent'
  downpaymentPercent?: number
  defaultPaymentPlanTemplateId?: string | null
}) {
  const { data } = await apiClient.put('/tuition/payment-policy', body)
  return data.data ?? data
}
