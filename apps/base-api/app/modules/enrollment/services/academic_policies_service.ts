import UsisAcademicPolicy, {
  type GradeDisplayMode,
  type GradeDocumentSignatory,
} from '#modules/enrollment/models/usis_academic_policy'
import Enrollment from '#modules/enrollment/models/enrollment'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

const DEFAULT_STEPS = ['adviser', 'assessment', 'registrar']
const ACTIVE_ENROLLMENT_STATUSES = [
  'draft',
  'advising',
  'advised',
  'incomplete',
  'assessed',
  'payment_verified',
  'registrar_approved',
  'registered',
]
const NEXT_TERM_HOLD =
  'You are enrolled for the current semester. The registrar opens enrollment for the next term after this semester ends.'
const IN_PROGRESS_HOLD =
  'You already have an enrollment in progress for this term. Continue with advising, assessment, and registration.'

export class AcademicPoliciesService {
  async getOrCreate(organizationId: string) {
    let row = await UsisAcademicPolicy.query().where('organization_id', organizationId).first()
    if (!row) {
      row = await UsisAcademicPolicy.create({
        organizationId,
        enrollmentApprovalSteps: [...DEFAULT_STEPS],
        gradeDisplayMode: 'after_deadline',
        gradeDocumentSignatories: [],
        nextTermEnrollmentOpen: false,
      })
    }
    return row
  }

  async studentEnrollmentWindow(organizationId: string, studentId: string) {
    const policy = await this.getOrCreate(organizationId)
    const current = await Enrollment.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .whereIn('status', ACTIVE_ENROLLMENT_STATUSES)
      .first()
    const nextTermEnrollmentOpen = Boolean(policy.nextTermEnrollmentOpen)
    const blocked = Boolean(current) && !nextTermEnrollmentOpen
    const holdReason = !blocked
      ? null
      : current?.status === 'registered'
        ? NEXT_TERM_HOLD
        : IN_PROGRESS_HOLD
    return {
      nextTermEnrollmentOpen,
      canStartEnrollment: !blocked,
      enrollmentHoldReason: holdReason,
    }
  }

  async update(input: {
    organizationId: string
    enrollmentApprovalSteps: string[]
    gradeDisplayMode: GradeDisplayMode
    gradeDocumentSignatories: GradeDocumentSignatory[]
    nextTermEnrollmentOpen: boolean
    actorUserId: string
  }) {
    const row = await this.getOrCreate(input.organizationId)
    row.enrollmentApprovalSteps = input.enrollmentApprovalSteps
    row.gradeDisplayMode = input.gradeDisplayMode
    row.gradeDocumentSignatories = input.gradeDocumentSignatories
    row.nextTermEnrollmentOpen = input.nextTermEnrollmentOpen
    await row.save()
    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'academic_policy',
      entityId: row.id,
    })
    return row
  }
}

export const academicPoliciesService = new AcademicPoliciesService()
