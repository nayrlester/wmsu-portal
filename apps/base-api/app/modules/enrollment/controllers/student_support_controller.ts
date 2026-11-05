import type { HttpContext } from '@adonisjs/core/http'
import { StudentSupportService } from '#modules/enrollment/services/student_support_service'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  officeStaffValidator,
  serviceRequestValidator,
  counselingRequestValidator,
  caseNoteValidator,
  healthEncounterValidator,
  healthClearanceValidator,
  disciplineComplaintValidator,
  scholarshipProgramValidator,
  scholarshipApplyValidator,
  scholarshipDecideValidator,
  queueTicketValidator,
} from '#modules/enrollment/validators/student_support'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import Student from '#modules/enrollment/models/student'
import { rbacService } from '#modules/enrollment/services/rbac_service'

export default class StudentSupportController {
  async assignStaff({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(officeStaffValidator)
    const id = await new StudentSupportService().assignOfficeStaff({
      organizationId: user.organizationId,
      assignedBy: user.id,
      ...payload,
    })
    return response.created({ data: { id } })
  }

  async createRequest({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(serviceRequestValidator)
    const id = await new StudentSupportService().createServiceRequest({
      organizationId: user.organizationId,
      createdBy: user.id,
      ...payload,
    })
    return response.created({ data: { id } })
  }

  async counselingRequest(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    const payload = await request.validateUsing(counselingRequestValidator)
    const granted = new Set(await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? []))
    const staffCounseling = granted.has('guidance.write') || granted.has('*')
    let studentId = payload.studentId
    if (!staffCounseling) {
      const email = user.email?.trim().toLowerCase()
      if (!email) {
        throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      }
      const student = await Student.query()
        .where('organization_id', user.organizationId)
        .whereRaw('LOWER(email) = ?', [email])
        .first()
      if (!student) {
        throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      }
      if (studentId !== student.id) {
        throw new EnrollmentWorkflowError('Cannot submit counseling for another student', 403, 'STUDENT_SCOPE')
      }
      studentId = student.id
    }
    const data = await new StudentSupportService().createCounselingRequest({
      organizationId: user.organizationId,
      createdBy: user.id,
      studentId,
      channel: payload.channel,
    })
    return response.created({ data })
  }

  async writeCaseNote({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(caseNoteValidator)
    const id = await new StudentSupportService().writeCaseNote({
      organizationId: user.organizationId,
      authorUserId: user.id,
      ...payload,
    })
    return response.created({ data: { id } })
  }

  async readCaseNotes({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().readCaseNotes({
      organizationId: user.organizationId,
      counselingRequestId: params.id,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async healthEncounter({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(healthEncounterValidator)
    const data = await new StudentSupportService().recordHealthEncounter({
      organizationId: user.organizationId,
      clinicianUserId: user.id,
      ...payload,
    })
    return response.created({ data })
  }

  async readClinicalNotes({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().readClinicalNotes({
      organizationId: user.organizationId,
      encounterId: params.id,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async healthClearance({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(healthClearanceValidator)
    const id = await new StudentSupportService().setHealthClearance({
      organizationId: user.organizationId,
      decidedBy: user.id,
      ...payload,
    })
    return response.created({ data: { id } })
  }

  async disciplineComplaint({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(disciplineComplaintValidator)
    const data = await new StudentSupportService().fileDisciplineComplaint({
      organizationId: user.organizationId,
      complainantUserId: user.id,
      ...payload,
    })
    return response.created({ data })
  }

  async scholarshipProgram({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(scholarshipProgramValidator)
    const id = await new StudentSupportService().upsertScholarshipProgram({
      organizationId: user.organizationId,
      ...payload,
    })
    return response.created({ data: { id } })
  }

  async scholarshipApply({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(scholarshipApplyValidator)
    const data = await new StudentSupportService().applyScholarship({
      organizationId: user.organizationId,
      submittedBy: user.id,
      ...payload,
    })
    return response.created({ data })
  }

  async scholarshipDecide({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(scholarshipDecideValidator)
    const data = await new StudentSupportService().decideScholarship({
      organizationId: user.organizationId,
      applicationId: params.id,
      actorUserId: user.id,
      ...payload,
    })
    return response.ok({ data })
  }

  async queueTicket(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    const payload = await request.validateUsing(queueTicketValidator)
    const granted = new Set(await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? []))
    const staffQueue =
      granted.has('guidance.write') || granted.has('health.write') || granted.has('osa.write') || granted.has('*')
    let studentId = payload.studentId ?? null
    if (!staffQueue) {
      const email = user.email?.trim().toLowerCase()
      if (!email) {
        throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      }
      const student = await Student.query()
        .where('organization_id', user.organizationId)
        .whereRaw('LOWER(email) = ?', [email])
        .first()
      if (!student) {
        throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      }
      if (studentId && studentId !== student.id) {
        throw new EnrollmentWorkflowError('Cannot issue queue ticket for another student', 403, 'STUDENT_SCOPE')
      }
      studentId = student.id
    }
    const data = await new StudentSupportService().issueQueueTicket({
      organizationId: user.organizationId,
      office: payload.office,
      serviceCode: payload.serviceCode,
      studentId,
    })
    return response.created({ data })
  }

  async clearanceHints({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().clearanceHints(user.organizationId, params.studentId)
    return response.ok({ data })
  }

  async officeReport({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const office = params.office
    if (!['guidance', 'health', 'osa', 'scholarship'].includes(office)) {
      throw new EnrollmentWorkflowError('Unknown office', 422, 'INVALID_OFFICE')
    }
    const data = await new StudentSupportService().officeReport(user.organizationId, office)
    return response.ok({ data })
  }

  async sensitiveAccessLog({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const q = db.from(t('sss_sensitive_access_logs')).where('organization_id', user.organizationId)
    if (request.input('office')) q.where('office', request.input('office'))
    const rows = await q.orderBy('accessed_at', 'desc').limit(100)
    return response.ok({ data: rows })
  }
}
