import UsisAcademicPolicy, {
  type GradeDisplayMode,
  type GradeDocumentSignatory,
} from '#modules/enrollment/models/usis_academic_policy'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

const DEFAULT_STEPS = ['adviser', 'assessment', 'registrar']

export class AcademicPoliciesService {
  async getOrCreate(organizationId: string) {
    let row = await UsisAcademicPolicy.query().where('organization_id', organizationId).first()
    if (!row) {
      row = await UsisAcademicPolicy.create({
        organizationId,
        enrollmentApprovalSteps: [...DEFAULT_STEPS],
        gradeDisplayMode: 'after_deadline',
        gradeDocumentSignatories: [],
      })
    }
    return row
  }

  async update(input: {
    organizationId: string
    enrollmentApprovalSteps: string[]
    gradeDisplayMode: GradeDisplayMode
    gradeDocumentSignatories: GradeDocumentSignatory[]
    actorUserId: string
  }) {
    const row = await this.getOrCreate(input.organizationId)
    row.enrollmentApprovalSteps = input.enrollmentApprovalSteps
    row.gradeDisplayMode = input.gradeDisplayMode
    row.gradeDocumentSignatories = input.gradeDocumentSignatories
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
