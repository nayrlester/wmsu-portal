import { resolveEnrollmentApprovalSteps } from '#modules/enrollment/services/academic_policy_runtime_service'
import type Enrollment from '#modules/enrollment/models/enrollment'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import AdvisingSession from '#modules/enrollment/models/advising_session'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type EnrollmentApprovalStep = 'adviser' | 'assessment' | 'registrar'

export async function enrollmentStepEnabled(
  organizationId: string,
  step: EnrollmentApprovalStep
): Promise<boolean> {
  const steps = await resolveEnrollmentApprovalSteps(organizationId)
  return steps.includes(step)
}

export async function assertAdvisingGate(enrollment: Enrollment, trx?: TransactionClientContract) {
  if (enrollment.advisingWaived) return
  if (!(await enrollmentStepEnabled(enrollment.organizationId, 'adviser'))) return

  const query = AdvisingSession.query()
  if (trx) query.useTransaction(trx)
  const endorsed = await query
    .where('enrollment_id', enrollment.id)
    .where('status', 'endorsed')
    .first()
  if (!endorsed) {
    throw new EnrollmentWorkflowError(
      'Academic advising is required by institutional policy (ENR-008)',
      422,
      'ADVISING_REQUIRED'
    )
  }
}

export async function assertAssessmentGate(enrollment: Enrollment) {
  if (!(await enrollmentStepEnabled(enrollment.organizationId, 'assessment'))) return
  if (!enrollment.assessedAt) {
    throw new EnrollmentWorkflowError(
      'Assessment is required by institutional policy (ENR-008)',
      422,
      'ASSESSMENT_REQUIRED'
    )
  }
}

export async function assertPaymentGate(enrollment: Enrollment) {
  if (!(await enrollmentStepEnabled(enrollment.organizationId, 'assessment'))) return
  if (!enrollment.paymentVerified) {
    throw new EnrollmentWorkflowError('Payment not verified', 422, 'PAYMENT_REQUIRED')
  }
}

export async function assertRegistrarGate(enrollment: Enrollment) {
  if (!(await enrollmentStepEnabled(enrollment.organizationId, 'registrar'))) return
  if (!enrollment.registrarApprovedAt) {
    throw new EnrollmentWorkflowError(
      'Registrar approval is required before registration (ENR-008)',
      422,
      'REGISTRAR_APPROVAL_REQUIRED'
    )
  }
}
