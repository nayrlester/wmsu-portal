import type { HttpContext } from '@adonisjs/core/http'
import { receivablesService } from '#modules/finance/services/ufms/receivables_service'
import { resolveFinanceOrganizationId } from '#modules/finance/services/ufms/resolve_organization_id'

export default class InternalCashierController {
  async recordPayment({ request, response }: HttpContext) {
    const payload = request.only([
      'organizationId',
      'studentNumber',
      'amount',
      'paymentType',
      'reference',
      'particulars',
      'assessmentNumber',
    ])

    const organizationId = await resolveFinanceOrganizationId(String(payload.organizationId ?? ''))
    const studentNumber = payload.studentNumber as string
    const amount = Number(payload.amount)

    if (!organizationId || !studentNumber || !Number.isFinite(amount)) {
      return response.badRequest({ error: 'organizationId, studentNumber, and amount are required' })
    }

    const idempotencyKey = (request.header('idempotency-key') ?? payload.reference ?? null) as string | null

    const result = await receivablesService.recordStudentPayment({
      organizationId,
      studentNumber,
      amount,
      paymentType: (payload.paymentType as string | undefined) ?? 'tuition',
      reference: (payload.reference as string | null | undefined) ?? null,
      particulars: (payload.particulars as string | null | undefined) ?? null,
      assessmentNumber: (payload.assessmentNumber as string | undefined) ?? null,
      idempotencyKey,
    })

    const receipt = result.receipt as Record<string, unknown>
    return response.status(result.deduplicated ? 200 : 201).json({
      data: {
        receipt: {
          ...receipt,
          or_number: receipt.or_number,
        },
        payment: result.payment,
        deduplicated: result.deduplicated,
      },
    })
  }
}
