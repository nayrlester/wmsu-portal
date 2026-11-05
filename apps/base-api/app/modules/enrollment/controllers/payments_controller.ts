import type { HttpContext } from '@adonisjs/core/http'
import Payment from '#modules/enrollment/models/payment'
import Student from '#modules/enrollment/models/student'
import Assessment from '#modules/enrollment/models/assessment'
import { recordPaymentValidator } from '#modules/enrollment/validators/enrollment'
import { FinancePaymentClient } from '#modules/enrollment/services/integrations/finance_payment_client'
import { AssessmentService } from '#modules/enrollment/services/assessment_service'
import env from '#start/env'
import { DateTime } from 'luxon'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'

export default class PaymentsController {
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const studentId = request.input('studentId')

    const query = Payment.query()
      .where('organization_id', user.organizationId)
      .preload('student')
      .orderBy('paid_at', 'desc')

    if (studentId) query.where('student_id', studentId)

    const payments = await query.paginate(page, limit)
    return response.ok({ data: payments })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(recordPaymentValidator)

    const student = await Student.query()
      .where('id', payload.studentId)
      .where('organization_id', user.organizationId)
      .firstOrFail()

    const financeConfigured = Boolean(env.get('FINANCE_API_URL')?.trim())
    const mock = process.env.FINANCE_MOCK === 'true'
    if (!financeConfigured && !mock) {
      throw new EnrollmentWorkflowError(
        'Payment posting requires UFMS. USiS does not independently mark payments successful.',
        422,
        'UFMS_REQUIRED'
      )
    }

    let assessmentNumber: string | null = null
    if (payload.enrollmentId) {
      const assessment = await Assessment.query().where('enrollment_id', payload.enrollmentId).first()
      assessmentNumber = assessment?.assessmentNumber ?? null
    }

    const finance = new FinancePaymentClient()
    const fin = await finance.postStudentPayment({
      organizationId: user.organizationId,
      studentNumber: student.studentNumber,
      amount: payload.amount,
      paymentType: payload.paymentType,
      reference: payload.reference,
      particulars: payload.particulars,
      assessmentNumber,
    })
    const receipt = fin.data.receipt as { or_number?: string; id?: string } | undefined
    const paymentRow = (fin.data as { payment?: { id?: string } }).payment

    const payment = await Payment.create({
      organizationId: user.organizationId,
      ...payload,
      orNumber: receipt?.or_number ?? null,
      assessmentId: null,
      ufmsPaymentId: paymentRow?.id ?? null,
      confirmationSource: 'ufms',
      ufmsConfirmed: true,
      paidAt: DateTime.now(),
      receivedBy: user.id,
    })

    if (assessmentNumber && payload.enrollmentId) {
      const assessment = await Assessment.query().where('enrollment_id', payload.enrollmentId).first()
      if (assessment) {
        const service = new AssessmentService()
        await service.syncPaymentStatus({
          organizationId: user.organizationId,
          assessmentId: assessment.id,
          actorUserId: user.id,
          idempotencyKey: request.header('idempotency-key') ?? undefined,
        })
      }
    }

    return response.created({
      data: payment,
      meta: {
        note: 'Local payment row is a UFMS confirmation mirror only; enrollment payment status updates via UFMS sync.',
        assessmentNumber,
      },
    })
  }
}
