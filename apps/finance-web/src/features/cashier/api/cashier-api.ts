import { apiClient } from '@/lib/api-client'

export async function recordCashierPayment(input: {
  studentNumber: string
  amount: number
  paymentType?: string
  reference?: string
  particulars?: string
  assessmentNumber?: string
}) {
  const { data } = await apiClient.post('/cashier/payments', input)
  return data.data
}

export async function fetchStudentAccount(studentNumber: string) {
  const { data } = await apiClient.get(`/cashier/students/${encodeURIComponent(studentNumber)}`)
  return data.data
}

export async function fetchDailyCollection(businessDate?: string) {
  const { data } = await apiClient.get('/cashier/reports/daily-collection', {
    params: businessDate ? { businessDate } : undefined,
  })
  return data.data
}
