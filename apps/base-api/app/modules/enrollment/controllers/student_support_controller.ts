import type { HttpContext } from '@adonisjs/core/http'
import { StudentSupportService } from '#modules/enrollment/services/student_support_service'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  officeStaffValidator,
  serviceRequestValidator,
  counselingRequestValidator,
  caseNoteValidator,
  counselingIntakeValidator,
  counselingAssignValidator,
  counselingSessionValidator,
  counselingSpecialistReferralValidator,
  counselingResolveValidator,
  healthEncounterValidator,
  healthClearanceValidator,
  healthConditionValidator,
  medicalAlertValidator,
  healthPrescriptionValidator,
  hospitalReferralValidator,
  medicalAssessmentValidator,
  healthProgramValidator,
  disciplineComplaintValidator,
  disciplineAdvanceValidator,
  disciplineSanctionValidator,
  scholarshipProgramValidator,
  scholarshipApplyValidator,
  scholarshipDecideValidator,
  saApplyValidator,
  saRequirementsValidator,
  saInterviewValidator,
  saAdvanceValidator,
  queueTicketValidator,
  queueAdvanceValidator,
  orgApplicationSubmitValidator,
  orgApplicationAdvanceValidator,
  studentIdRequestSubmitValidator,
  studentIdRequestUpdateValidator,
  officeReferralValidator,
  psychScheduleValidator,
  psychScheduleStatusValidator,
  psychEncodeValidator,
  psychReleaseValidator,
  shiftingApplyValidator,
  shiftingRequirementsValidator,
  shiftingScheduleValidator,
  shiftingPaymentValidator,
  shiftingResultReadyValidator,
  shiftingReleaseValidator,
  shiftingEndorseValidator,
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

  async listCounselingRequests({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const openOnlyRaw = request.input('openOnly')
    const data = await new StudentSupportService().listCounselingRequests(user.organizationId, {
      studentId: request.input('studentId') ?? undefined,
      status: request.input('status') ?? undefined,
      openOnly: openOnlyRaw === true || openOnlyRaw === 'true' || openOnlyRaw === '1',
    })
    return response.ok({ data })
  }

  async getCounselingRequest({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().getCounselingRequest(user.organizationId, params.id)
    return response.ok({ data })
  }

  async documentCounselingIntake({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(counselingIntakeValidator)
    const data = await new StudentSupportService().documentCounselingIntake({
      organizationId: user.organizationId,
      counselingRequestId: params.id,
      actorUserId: user.id,
      intakeSummary: payload.intakeSummary,
    })
    return response.ok({ data })
  }

  async assignCounselingRequest({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(counselingAssignValidator)
    const data = await new StudentSupportService().assignCounselor({
      organizationId: user.organizationId,
      counselingRequestId: params.id,
      counselorId: payload.counselorId ?? user.id,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async recordCounselingSession({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(counselingSessionValidator)
    const data = await new StudentSupportService().recordCounselingSession({
      organizationId: user.organizationId,
      counselingRequestId: params.id,
      counselorId: user.id,
      actorUserId: user.id,
      ...payload,
    })
    return response.ok({ data })
  }

  async specialistCounselingReferral({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(counselingSpecialistReferralValidator)
    const data = await new StudentSupportService().createGuidanceReferral({
      organizationId: user.organizationId,
      fromRequestId: params.id,
      toOffice: payload.toOffice,
      specialistType: payload.specialistType,
      reasonSummary: payload.reasonSummary ?? null,
      createdBy: user.id,
      markReferred: true,
    })
    return response.ok({ data })
  }

  async resolveCounselingRequest({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(counselingResolveValidator)
    const data = await new StudentSupportService().resolveCounselingRequest({
      organizationId: user.organizationId,
      counselingRequestId: params.id,
      actorUserId: user.id,
      resolutionSummary: payload.resolutionSummary ?? null,
    })
    return response.ok({ data })
  }

  async counselingSpecialistCatalog({ response }: HttpContext) {
    return response.ok({ data: new StudentSupportService().counselingSpecialistCatalog() })
  }

  async counselingCaseReport({ response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().counselingCaseReport(user.organizationId)
    return response.ok({ data })
  }

  async healthEncounter({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(healthEncounterValidator)
    const data = await new StudentSupportService().recordHealthEncounter({
      organizationId: user.organizationId,
      clinicianUserId: user.id,
      studentId: payload.studentId,
      encounterType: payload.encounterType,
      isEmergency: payload.isEmergency,
      clinicalNote: payload.clinicalNote ?? null,
      diagnosisLabel: payload.diagnosisLabel ?? null,
      medicationLabel: payload.medicationLabel ?? null,
      medicationInstructions: payload.medicationInstructions ?? null,
      hospitalReferralFacility: payload.hospitalReferralFacility ?? null,
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

  async healthProgramCatalog({ response }: HttpContext) {
    return response.ok({ data: new StudentSupportService().healthProgramCatalog() })
  }

  async recordHealthProgram({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(healthProgramValidator)
    const id = await new StudentSupportService().recordHealthProgram({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      programCode: payload.programCode,
      status: payload.status,
      recordedBy: user.id,
    })
    return response.created({ data: { id } })
  }

  async listHealthPrograms({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listHealthProgramParticipations(
      user.organizationId,
      request.input('studentId') ?? undefined
    )
    return response.ok({ data })
  }

  async medicalAssessment({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(medicalAssessmentValidator)
    const id = await new StudentSupportService().recordMedicalAssessment({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      assessmentContext: payload.assessmentContext,
      status: payload.status,
      decidedBy: user.id,
      validUntil: payload.validUntil ?? null,
      requireProgramsComplete: payload.requireProgramsComplete ?? false,
    })
    return response.created({ data: { id } })
  }

  async enrollmentHealthGate({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().enrollmentHealthGateCheck(
      user.organizationId,
      params.studentId
    )
    return response.ok({ data })
  }

  async healthProgramStatistics({ response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().healthProgramStatistics(user.organizationId)
    return response.ok({ data })
  }

  async studentEhrProfile({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().getStudentEhrProfile(
      user.organizationId,
      params.studentId,
      user.id
    )
    return response.ok({ data })
  }

  async addHealthCondition({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(healthConditionValidator)
    const id = await new StudentSupportService().addChronicCondition({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      conditionCode: payload.conditionCode,
      label: payload.label,
      isChronic: payload.isChronic,
      recordedBy: user.id,
    })
    return response.created({ data: { id } })
  }

  async addMedicalAlert({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(medicalAlertValidator)
    const id = await new StudentSupportService().addMedicalAlert({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      alertCode: payload.alertCode,
      severity: payload.severity,
      recordedBy: user.id,
    })
    return response.created({ data: { id } })
  }

  async addHealthPrescription({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(healthPrescriptionValidator)
    const id = await new StudentSupportService().addHealthPrescription({
      organizationId: user.organizationId,
      encounterId: payload.encounterId,
      studentId: payload.studentId,
      medicationLabel: payload.medicationLabel,
      instructions: payload.instructions ?? null,
      prescribedBy: user.id,
    })
    return response.created({ data: { id } })
  }

  async createHospitalReferral({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(hospitalReferralValidator)
    const id = await new StudentSupportService().createHospitalReferral({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      encounterId: payload.encounterId ?? null,
      toFacility: payload.toFacility,
      createdBy: user.id,
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

  async listDisciplineCases({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const openOnlyRaw = request.input('openOnly')
    const data = await new StudentSupportService().listDisciplineCases(user.organizationId, {
      studentId: request.input('studentId') ?? undefined,
      workflowStatus: request.input('workflowStatus') ?? undefined,
      openOnly: openOnlyRaw === true || openOnlyRaw === 'true' || openOnlyRaw === '1',
    })
    return response.ok({ data })
  }

  async getDisciplineCase({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().getDisciplineCase(user.organizationId, params.id)
    return response.ok({ data })
  }

  async advanceDisciplineCase({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(disciplineAdvanceValidator)
    const data = await new StudentSupportService().advanceDisciplineCase({
      organizationId: user.organizationId,
      caseId: params.id,
      actorUserId: user.id,
      ...payload,
    })
    return response.ok({ data })
  }

  async recordDisciplineSanction({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(disciplineSanctionValidator)
    const data = await new StudentSupportService().recordSanction({
      organizationId: user.organizationId,
      caseId: params.id,
      recordedBy: user.id,
      ...payload,
    })
    return response.ok({ data })
  }

  async disciplinaryHistory({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listDisciplinaryHistory(
      user.organizationId,
      params.studentId
    )
    return response.ok({ data })
  }

  async disciplineCaseReport({ response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().disciplineCaseReport(user.organizationId)
    return response.ok({ data })
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

  async listScholarshipApplications({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listScholarshipApplications(user.organizationId, {
      studentId: request.input('studentId') ?? undefined,
      status: request.input('status') ?? undefined,
    })
    return response.ok({ data })
  }

  async listScholarshipAwards({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listActiveScholarshipAwards(
      user.organizationId,
      request.input('studentId') ?? undefined
    )
    return response.ok({ data })
  }

  async scholarshipAssistanceReport({ response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().scholarshipAssistanceReport(user.organizationId)
    return response.ok({ data })
  }

  async submitSaApplication({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(saApplyValidator)
    const id = await new StudentSupportService().submitSaApplication({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      requirementsJson: (payload.requirementsJson as Record<string, unknown> | undefined) ?? null,
      actorUserId: user.id,
    })
    return response.created({ data: { id } })
  }

  async listSaApplications({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listSaApplications(user.organizationId, {
      studentId: request.input('studentId') ?? undefined,
      workflowStatus: request.input('workflowStatus') ?? undefined,
    })
    return response.ok({ data })
  }

  async getSaApplication({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().getSaApplication(user.organizationId, params.id)
    return response.ok({ data })
  }

  async updateSaRequirements({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(saRequirementsValidator)
    const data = await new StudentSupportService().updateSaRequirements({
      organizationId: user.organizationId,
      applicationId: params.id,
      documents: payload.documents,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async scheduleSaInterview({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(saInterviewValidator)
    const data = await new StudentSupportService().scheduleSaInterview({
      organizationId: user.organizationId,
      applicationId: params.id,
      interviewAt: payload.interviewAt,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async advanceSaApplication({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(saAdvanceValidator)
    const data = await new StudentSupportService().advanceSaApplication({
      organizationId: user.organizationId,
      applicationId: params.id,
      workflowStatus: payload.workflowStatus,
      deploymentOffice: payload.deploymentOffice ?? null,
      interviewScore: payload.interviewScore ?? null,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async queueTicket(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    const payload = await request.validateUsing(queueTicketValidator)
    const granted = new Set(await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? []))
    const staffQueue =
      granted.has('guidance.write') ||
      granted.has('health.write') ||
      granted.has('osa.write') ||
      granted.has('enrollments.write') ||
      granted.has('*')
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
      actorUserId: user.id,
    })
    return response.created({ data })
  }

  async listQueueTickets({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const todayOnlyRaw = request.input('todayOnly')
    const data = await new StudentSupportService().listQueueTickets(user.organizationId, {
      office: request.input('office') ?? undefined,
      status: request.input('status') ?? undefined,
      studentId: request.input('studentId') ?? undefined,
      todayOnly: !(todayOnlyRaw === false || todayOnlyRaw === 'false' || todayOnlyRaw === '0'),
    })
    return response.ok({ data })
  }

  async getQueueTicket({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().getQueueTicket(user.organizationId, params.id)
    return response.ok({ data })
  }

  async queueDisplayStatus({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const office = String(request.input('office') ?? 'guidance')
    const data = await new StudentSupportService().queueDisplayStatus(
      user.organizationId,
      office as 'guidance' | 'health' | 'osa' | 'registrar'
    )
    return response.ok({ data })
  }

  async advanceQueueTicket({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(queueAdvanceValidator)
    const data = await new StudentSupportService().advanceQueueTicket({
      organizationId: user.organizationId,
      ticketId: params.id,
      status: payload.status,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async queueAnalyticsReport({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const office = request.input('office') ?? undefined
    const data = await new StudentSupportService().queueAnalyticsReport(
      user.organizationId,
      office ?? undefined
    )
    return response.ok({ data })
  }

  async queueTicketSlipPdf({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const file = await new StudentSupportService().queueTicketSlipPdf(user.organizationId, params.id)
    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
    return response.send(file.body)
  }

  async listOrgApplications({ response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listOrgApplications(user.organizationId)
    return response.ok({ data })
  }

  async listStudentOrganizations({ response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listStudentOrganizations(user.organizationId)
    return response.ok({ data })
  }

  async getOrgApplication({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().getOrgApplication(user.organizationId, params.id)
    return response.ok({ data })
  }

  async submitOrgApplication({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(orgApplicationSubmitValidator)
    const data = await new StudentSupportService().submitOrgApplication({
      organizationId: user.organizationId,
      submittedBy: user.id,
      proposedName: payload.proposedName,
      applicationType: payload.applicationType,
      requirementsJson: (payload.requirementsJson as Record<string, unknown> | null | undefined) ?? null,
    })
    return response.created({ data })
  }

  async advanceOrgApplication({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(orgApplicationAdvanceValidator)
    const data = await new StudentSupportService().advanceOrgApplication({
      organizationId: user.organizationId,
      applicationId: params.id,
      actorUserId: user.id,
      workflowStatus: payload.workflowStatus,
      issueCertificateRef: payload.issueCertificateRef ?? null,
    })
    return response.ok({ data })
  }

  async orgAccreditationCertificate({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const file = await new StudentSupportService().orgAccreditationCertificate(
      user.organizationId,
      params.id
    )
    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
    return response.send(file.body)
  }

  async listStudentIdRequests(ctx: HttpContext) {
    const { response, auth, request } = ctx
    const user = auth.user!
    const granted = new Set(await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? []))
    const staff = granted.has('osa.read') || granted.has('osa.write') || granted.has('*')
    let studentId = request.input('studentId') as string | undefined
    if (!staff) {
      const email = user.email?.trim().toLowerCase()
      if (!email) throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      const student = await Student.query()
        .where('organization_id', user.organizationId)
        .whereRaw('LOWER(email) = ?', [email])
        .first()
      if (!student) throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      studentId = student.id
    }
    const data = await new StudentSupportService().listStudentIdRequests(user.organizationId, {
      studentId: studentId ?? null,
    })
    return response.ok({ data })
  }

  async studentParticipationProfile({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().studentParticipationProfile(
      user.organizationId,
      params.studentId
    )
    return response.ok({ data })
  }

  async submitStudentIdRequest(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    const payload = await request.validateUsing(studentIdRequestSubmitValidator)
    const granted = new Set(await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? []))
    const staff = granted.has('osa.write') || granted.has('*')
    let studentId = payload.studentId ?? null
    if (!staff) {
      const email = user.email?.trim().toLowerCase()
      if (!email) throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      const student = await Student.query()
        .where('organization_id', user.organizationId)
        .whereRaw('LOWER(email) = ?', [email])
        .first()
      if (!student) throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      if (studentId && studentId !== student.id) {
        throw new EnrollmentWorkflowError('Cannot submit ID request for another student', 403, 'STUDENT_SCOPE')
      }
      studentId = student.id
    }
    if (!studentId) {
      throw new EnrollmentWorkflowError('studentId is required', 422, 'STUDENT_ID_REQUIRED')
    }
    const data = await new StudentSupportService().requestStudentId({
      organizationId: user.organizationId,
      studentId,
      requestType: payload.requestType,
      submittedBy: user.id,
    })
    return response.created({ data })
  }

  async updateStudentIdRequest({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(studentIdRequestUpdateValidator)
    const data = await new StudentSupportService().updateStudentIdRequest({
      organizationId: user.organizationId,
      requestId: params.id,
      actorUserId: user.id,
      status: payload.status,
      rfidRef: payload.rfidRef ?? null,
      paymentValidationRef: payload.paymentValidationRef ?? null,
      printUnitStatus: payload.printUnitStatus ?? null,
    })
    return response.ok({ data })
  }

  async verifyDigitalStudentId({ params, response }: HttpContext) {
    const data = await new StudentSupportService().verifyDigitalStudentId(params.token)
    if (!data.valid && 'reason' in data && data.reason === 'not_found') {
      return response.notFound({ data })
    }
    return response.ok({ data })
  }

  async downloadDigitalStudentIdPdf(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.user!
    const granted = new Set(await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? []))
    const staff = granted.has('osa.read') || granted.has('osa.write') || granted.has('*')
    const service = new StudentSupportService()
    const requestRow = await service.getStudentIdRequest(user.organizationId, params.id)
    if (!staff) {
      const email = user.email?.trim().toLowerCase()
      if (!email) throw new EnrollmentWorkflowError('No student profile linked', 403, 'STUDENT_PROFILE_REQUIRED')
      const student = await Student.query()
        .where('organization_id', user.organizationId)
        .whereRaw('LOWER(email) = ?', [email])
        .first()
      if (!student || student.id !== requestRow.studentId) {
        throw new EnrollmentWorkflowError('Forbidden', 403, 'FORBIDDEN')
      }
    }
    const file = await service.digitalStudentIdPdfPackage(user.organizationId, params.id)
    if (!file) return response.notFound({ error: 'Digital ID not issued' })
    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
    return response.send(file.body)
  }

  async clearanceHints({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().clearanceHints(user.organizationId, params.studentId)
    return response.ok({ data })
  }

  async crossOfficeClearance({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().crossOfficeClearanceCheck(
      user.organizationId,
      params.studentId
    )
    return response.ok({ data })
  }

  async unifiedStudentProfile({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().unifiedStudentSupportProfile(
      user.organizationId,
      params.studentId,
      user.id
    )
    return response.ok({ data })
  }

  async listStudentReferrals({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listOfficeReferrals(user.organizationId, params.studentId)
    return response.ok({ data })
  }

  async listStudentAlerts({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listStudentAlerts(user.organizationId, params.studentId)
    return response.ok({ data })
  }

  async createOfficeReferral({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(officeReferralValidator)
    const data = await new StudentSupportService().createOfficeReferral({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      fromOffice: payload.fromOffice,
      toOffice: payload.toOffice,
      reasonSummary: payload.reasonSummary ?? null,
      createdBy: user.id,
      fromRequestId: payload.fromRequestId ?? null,
      encounterId: payload.encounterId ?? null,
    })
    return response.created({ data })
  }

  async psychBatteryCatalog({ response }: HttpContext) {
    return response.ok({ data: new StudentSupportService().psychTestBatteryCatalog() })
  }

  async listPsychSchedules({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listPsychSchedules(
      user.organizationId,
      request.input('collegeCode') ?? null
    )
    return response.ok({ data })
  }

  async schedulePsychTest({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(psychScheduleValidator)
    const id = await new StudentSupportService().schedulePsychTest({
      organizationId: user.organizationId,
      title: payload.title,
      collegeCode: payload.collegeCode ?? null,
      scheduledAt: payload.scheduledAt,
      venue: payload.venue ?? null,
      createdBy: user.id,
    })
    return response.created({ data: { id } })
  }

  async updatePsychScheduleStatus({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(psychScheduleStatusValidator)
    await new StudentSupportService().updatePsychScheduleStatus({
      organizationId: user.organizationId,
      scheduleId: params.id,
      status: payload.status,
    })
    return response.ok({ data: { id: params.id, status: payload.status } })
  }

  async listPsychResults({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listPsychResults(user.organizationId, {
      studentId: request.input('studentId') ?? undefined,
      scheduleId: request.input('scheduleId') ?? undefined,
    })
    return response.ok({ data })
  }

  async encodePsychResult({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(psychEncodeValidator)
    const id = await new StudentSupportService().encodePsychResult({
      organizationId: user.organizationId,
      scheduleId: payload.scheduleId ?? null,
      studentId: payload.studentId,
      testCode: payload.testCode,
      encodedBy: user.id,
    })
    return response.created({ data: { id } })
  }

  async psychTestReport({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().psychTestReport(
      user.organizationId,
      params.id,
      user.id
    )
    return response.ok({ data })
  }

  async releasePsychResult({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(psychReleaseValidator)
    await new StudentSupportService().releasePsychResult({
      organizationId: user.organizationId,
      resultId: params.id,
      actorUserId: user.id,
      consultationCompleted: payload.consultationCompleted,
    })
    return response.ok({ data: { id: params.id, released: true } })
  }

  async listShiftingExams({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().listShiftingExamApplications(user.organizationId, {
      studentId: request.input('studentId') ?? undefined,
    })
    return response.ok({ data })
  }

  async applyShiftingExam({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(shiftingApplyValidator)
    const id = await new StudentSupportService().applyShiftingExam({
      organizationId: user.organizationId,
      studentId: payload.studentId,
      fromProgramCode: payload.fromProgramCode ?? null,
      toProgramCode: payload.toProgramCode ?? null,
      requirementsJson: (payload.requirementsJson as Record<string, unknown> | undefined) ?? null,
      actorUserId: user.id,
    })
    return response.created({ data: { id } })
  }

  async getShiftingExam({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const data = await new StudentSupportService().getShiftingExamApplication(
      user.organizationId,
      params.id
    )
    return response.ok({ data })
  }

  async updateShiftingRequirements({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(shiftingRequirementsValidator)
    const data = await new StudentSupportService().updateShiftingRequirements({
      organizationId: user.organizationId,
      applicationId: params.id,
      documents: payload.documents,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async scheduleShiftingExam({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(shiftingScheduleValidator)
    const data = await new StudentSupportService().scheduleShiftingExam({
      organizationId: user.organizationId,
      applicationId: params.id,
      examScheduledAt: payload.examScheduledAt,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async tagShiftingPayment({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(shiftingPaymentValidator)
    const data = await new StudentSupportService().tagShiftingPayment({
      organizationId: user.organizationId,
      applicationId: params.id,
      paymentTag: payload.paymentTag,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async markShiftingResultReady({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(shiftingResultReadyValidator)
    const data = await new StudentSupportService().markShiftingResultReady({
      organizationId: user.organizationId,
      applicationId: params.id,
      resultSummary: payload.resultSummary ?? null,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async releaseShiftingResult({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(shiftingReleaseValidator)
    const data = await new StudentSupportService().releaseShiftingResult({
      organizationId: user.organizationId,
      applicationId: params.id,
      consultationCompleted: payload.consultationCompleted,
      actorUserId: user.id,
    })
    return response.ok({ data })
  }

  async endorseShiftingExam({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(shiftingEndorseValidator)
    const data = await new StudentSupportService().endorseShiftingExam({
      organizationId: user.organizationId,
      applicationId: params.id,
      party: payload.party,
      decision: payload.decision,
      actorUserId: user.id,
    })
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
