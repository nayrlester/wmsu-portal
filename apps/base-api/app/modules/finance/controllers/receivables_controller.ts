import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { ok, fail } from '#modules/finance/helpers/api_envelope'
import { t } from '#modules/finance/helpers/db_schema'
import { receivablesService } from '#modules/finance/services/ufms/receivables_service'
import { resolveFinanceOrganizationId } from '#modules/finance/services/ufms/resolve_organization_id'

export default class ReceivablesController {
  async recordPayment({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = request.only([
      'studentNumber',
      'amount',
      'paymentType',
      'reference',
      'particulars',
      'assessmentNumber',
    ])
    try {
      let organizationId = await resolveFinanceOrganizationId(user.organizationId)
      const assessmentNumber =
        (payload.assessmentNumber as string | undefined)?.trim() || null
      if (assessmentNumber) {
        const assessment = await db
          .from(t('student_assessments'))
          .where('assessment_number', assessmentNumber)
          .orderBy('assessed_at', 'desc')
          .first()
        if (assessment?.organization_id) {
          organizationId = String(assessment.organization_id)
        }
      }
      const result = await receivablesService.recordStudentPayment({
        organizationId,
        studentNumber: String(payload.studentNumber),
        amount: Number(payload.amount),
        paymentType: (payload.paymentType as string | undefined) ?? 'tuition',
        reference: (payload.reference as string | null | undefined) ?? null,
        particulars: (payload.particulars as string | null | undefined) ?? null,
        assessmentNumber,
        idempotencyKey: request.header('idempotency-key') ?? (payload.reference as string | null) ?? null,
        receivedBy: user.id,
      })
      return response.created(ok(result, 'Payment recorded'))
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Invalid payment'))
      throw error
    }
  }

  async listPayments({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const studentNumber = request.input('studentNumber')
    const report = await receivablesService.dailyCollectionReport(
      user.organizationId,
      request.input('businessDate')
    )
    if (studentNumber) {
      const account = await receivablesService.getStudentAccount(user.organizationId, String(studentNumber))
      return response.ok(ok({ account, page, limit }, 'Student account'))
    }
    return response.ok(ok(report, 'Daily collection report'))
  }

  async studentAccount({ params, response, auth }: HttpContext) {
    const account = await receivablesService.getStudentAccount(
      auth.user!.organizationId,
      params.studentNumber
    )
    return response.ok(ok(account, 'Student account'))
  }

  async dailyCollection({ request, response, auth }: HttpContext) {
    const report = await receivablesService.dailyCollectionReport(
      auth.user!.organizationId,
      request.input('businessDate')
    )
    return response.ok(ok(report, 'Daily collection report'))
  }

  async createDepositSlip({ request, response, auth }: HttpContext) {
    const payload = request.only(['bankAccountId', 'depositDate', 'paymentIds'])
    const paymentIds = (payload.paymentIds as string[] | undefined) ?? []
    try {
      const slip = await receivablesService.createDepositSlip(auth.user!.organizationId, {
        bankAccountId: payload.bankAccountId as string | undefined,
        depositDate: String(payload.depositDate ?? new Date().toISOString().slice(0, 10)),
        paymentIds,
      })
      return response.created(ok(slip, 'Deposit slip created'))
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Invalid deposit slip'))
      throw error
    }
  }

  async getSettings({ response, auth }: HttpContext) {
    const settings = await receivablesService.getSettings(auth.user!.organizationId)
    return response.ok(ok(settings, 'UFMS settings'))
  }

  async updateSettings({ request, response, auth }: HttpContext) {
    const settings = await receivablesService.updateSettings(
      auth.user!.organizationId,
      request.body() as Record<string, unknown>
    )
    return response.ok(ok(settings, 'UFMS settings updated'))
  }
}
