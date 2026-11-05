import env from '#start/env'

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
}

export type UfmsPaymentStatus = {
  assessmentNumber: string
  ufmsAssessmentId: string
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'failed' | 'pending'
  assessedAmount: number
  paidAmount: number
  balanceAmount: number
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
  private base() {
    return (env.get('FINANCE_API_URL') ?? 'http://127.0.0.1:3342').replace(/\/$/, '')
  }

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
    const res = await fetch(`${this.base()}/api/v1/internal/assessments`, {
      method: 'POST',
      headers: this.headers(input.idempotencyKey),
      body: JSON.stringify(input),
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
    const url = new URL(
      `${this.base()}/api/v1/internal/assessments/${encodeURIComponent(input.assessmentNumber)}/payment-status`
    )
    url.searchParams.set('organizationId', input.organizationId)
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
  if (process.env.FINANCE_MOCK === 'true' || env.get('FINANCE_MOCK') === true) {
    return new MockFinanceAssessmentClient()
  }
  if ((env.get('FINANCE_API_URL') ?? '').trim() === '') {
    return new MockFinanceAssessmentClient()
  }
  return new HttpFinanceAssessmentClient()
}
