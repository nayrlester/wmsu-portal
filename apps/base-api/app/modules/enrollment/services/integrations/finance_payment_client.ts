import env from '#start/env'
import { randomUUID } from 'node:crypto'

export class FinancePaymentClient {
  async postStudentPayment(input: {
    organizationId: string
    studentNumber: string
    amount: number
    paymentType?: string
    reference?: string | null
    particulars?: string | null
    assessmentNumber?: string | null
  }) {
    if (process.env.FINANCE_MOCK === 'true' || env.get('FINANCE_MOCK') === true) {
      const orNumber = `MOCK-OR-${Date.now()}`
      return {
        data: {
          receipt: { or_number: orNumber, id: randomUUID() },
          payment: { id: randomUUID(), assessment_number: input.assessmentNumber ?? null },
        },
      }
    }

    const base = (env.get('FINANCE_API_URL') ?? 'http://127.0.0.1:3342').replace(/\/$/, '')
    const key = env.get('SERVICE_API_KEY') ?? ''
    const res = await fetch(`${base}/api/v1/internal/cashier/payments`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Service-Api-Key': key,
        ...(input.reference ? { 'Idempotency-Key': String(input.reference) } : {}),
      },
      body: JSON.stringify({
        organizationId: input.organizationId,
        studentNumber: input.studentNumber,
        amount: input.amount,
        paymentType: input.paymentType ?? 'tuition',
        reference: input.reference,
        particulars: input.particulars,
        assessmentNumber: input.assessmentNumber,
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      throw new Error(body.message ?? body.error ?? `Finance payment failed (${res.status})`)
    }
    return (await res.json()) as { data: { receipt?: { or_number?: string }; payment?: { id?: string } } }
  }
}
