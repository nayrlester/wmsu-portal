import env from '#start/env'
import {
  financeInternalPath,
  resolveFinanceOrganizationId,
} from '#modules/enrollment/services/integrations/finance_api_paths'

export type UfmsAssessmentSubmitInput = {
  organizationId: string
  studentNumber: string
  assessmentNumber: string
  usisAssessmentId: string
  enrollmentRef: string
  tuitionFee: number
  miscFees: number
  discount: number
  totalAmount: number
  netAmount: number
  breakdown: Record<string, unknown>
  assessedAt: string
  idempotencyKey: string
  programId?: string | null
  yearLevel?: number | null
  classification?: string | null
}

export type UfmsPaymentStatus = {
  assessmentNumber: string
  ufmsAssessmentId: string
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'failed' | 'pending'
  assessedAmount: number
  paidAmount: number
  balanceAmount: number
  minimumDueRequired?: number
  installments?: Array<{
    sequence: number
    label: string
    amount: number
    paidAmount: number
    dueDate: string | null
    status: string
  }>
  payments: Array<{
    id: string
    amount: number
    orNumber: string | null
    reference: string | null
    paidAt: string
  }>
}

export interface FinanceAssessmentGateway {
  submitAssessment(input: UfmsAssessmentSubmitInput): Promise<{
    ufmsAssessmentId: string
    assessmentNumber: string
    paymentStatus: string
    httpStatus: number
    raw: Record<string, unknown>
  }>
  getPaymentStatus(input: {
    organizationId: string
    assessmentNumber: string
  }): Promise<UfmsPaymentStatus>
}

const mockStore = new Map<
  string,
  {
    input: UfmsAssessmentSubmitInput
    paidAmount: number
    paymentStatus: UfmsPaymentStatus['paymentStatus']
    payments: UfmsPaymentStatus['payments']
  }
>()

export class MockFinanceAssessmentClient implements FinanceAssessmentGateway {
  async submitAssessment(input: UfmsAssessmentSubmitInput) {
    const existing = [...mockStore.values()].find(
      (v) =>
        v.input.organizationId === input.organizationId &&
        (v.input.idempotencyKey === input.idempotencyKey ||
          v.input.assessmentNumber === input.assessmentNumber)
    )
    if (existing) {
      return {
        ufmsAssessmentId: `UFMS-ASM-${existing.input.assessmentNumber}`,
        assessmentNumber: existing.input.assessmentNumber,
        paymentStatus: existing.paymentStatus,
        httpStatus: 200,
        raw: { data: { deduplicated: true, assessmentNumber: existing.input.assessmentNumber } },
      }
    }
    mockStore.set(input.idempotencyKey, {
      input,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      payments: [],
    })
    return {
      ufmsAssessmentId: `UFMS-ASM-${input.assessmentNumber}`,
      assessmentNumber: input.assessmentNumber,
      paymentStatus: 'unpaid',
      httpStatus: 201,
      raw: { data: { id: `UFMS-ASM-${input.assessmentNumber}`, assessmentNumber: input.assessmentNumber } },
    }
  }

  async getPaymentStatus(input: { organizationId: string; assessmentNumber: string }) {
    const row = [...mockStore.values()].find(
      (v) =>
        v.input.organizationId === input.organizationId &&
        v.input.assessmentNumber === input.assessmentNumber
    )
    if (!row) {
      return {
        assessmentNumber: input.assessmentNumber,
        ufmsAssessmentId: `UFMS-ASM-${input.assessmentNumber}`,
        paymentStatus: 'unpaid' as const,
        assessedAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        payments: [],
      }
    }
    const assessed = Number(row.input.netAmount)
    return {
      assessmentNumber: row.input.assessmentNumber,
      ufmsAssessmentId: `UFMS-ASM-${row.input.assessmentNumber}`,
      paymentStatus: row.paymentStatus,
      assessedAmount: assessed,
      paidAmount: row.paidAmount,
      balanceAmount: Math.max(0, assessed - row.paidAmount),
      payments: row.payments,
    }
  }

  /** Test helper — simulate UFMS cashier confirmation */
  static confirmPayment(assessmentNumber: string, amount: number, reference = 'MOCK-OR') {
    for (const [key, row] of mockStore) {
      if (row.input.assessmentNumber !== assessmentNumber) continue
      row.paidAmount = amount
      row.paymentStatus = amount + 0.001 >= Number(row.input.netAmount) ? 'paid' : 'partial'
      row.payments.push({
        id: `pay-${Date.now()}`,
        amount,
        orNumber: reference,
        reference,
        paidAt: new Date().toISOString(),
      })
      mockStore.set(key, row)
      return row
    }
    throw new Error(`Mock assessment not found: ${assessmentNumber}`)
  }

  static reset() {
    mockStore.clear()
  }
}

export class HttpFinanceAssessmentClient implements FinanceAssessmentGateway {
  private headers(idempotencyKey?: string) {
    const h: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Service-Api-Key': env.get('SERVICE_API_KEY') ?? '',
      'X-Source-System': 'usis',
    }
    if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey
    return h
  }

  async submitAssessment(input: UfmsAssessmentSubmitInput) {
    const organizationId = await resolveFinanceOrganizationId(input.organizationId)
    const res = await fetch(financeInternalPath('/assessments'), {
      method: 'POST',
      headers: this.headers(input.idempotencyKey),
      body: JSON.stringify({ ...input, organizationId }),
    })
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      const msg =
        (raw.message as string) ||
        (raw.error as string) ||
        `UFMS assessment submit failed (${res.status})`
      throw new Error(msg)
    }
    const data = (raw.data ?? raw) as Record<string, unknown>
    return {
      ufmsAssessmentId: String(data.id ?? data.ufmsAssessmentId ?? ''),
      assessmentNumber: String(data.assessmentNumber ?? input.assessmentNumber),
      paymentStatus: String(data.paymentStatus ?? 'unpaid'),
      httpStatus: res.status,
      raw,
    }
  }

  async getPaymentStatus(input: { organizationId: string; assessmentNumber: string }) {
    const organizationId = await resolveFinanceOrganizationId(input.organizationId)
    const url = new URL(
      financeInternalPath(`/assessments/${encodeURIComponent(input.assessmentNumber)}/payment-status`)
    )
    url.searchParams.set('organizationId', organizationId)
    const res = await fetch(url, { headers: this.headers() })
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new Error(
        (raw.message as string) || (raw.error as string) || `UFMS payment status failed (${res.status})`
      )
    }
    const data = (raw.data ?? raw) as UfmsPaymentStatus
    return data
  }
}

export function createFinanceAssessmentClient(): FinanceAssessmentGateway {
  const mockFlag = process.env.FINANCE_MOCK ?? String(env.get('FINANCE_MOCK') ?? '')
  if (mockFlag === 'true') {
    return new MockFinanceAssessmentClient()
  }
  const financeUrl = (env.get('FINANCE_API_URL') ?? '').trim()
  if (!financeUrl) {
    if (mockFlag === 'false') {
      throw new Error('FINANCE_API_URL is required when FINANCE_MOCK=false')
    }
    return new MockFinanceAssessmentClient()
  }
  return new HttpFinanceAssessmentClient()
}
