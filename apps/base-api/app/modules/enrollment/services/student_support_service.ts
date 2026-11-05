import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  DISCIPLINE_WORKFLOW_STATUSES,
  ORG_ACCREDITATION_STATUSES,
  SA_WORKFLOW_STATUSES,
  type SssOffice,
} from '#modules/enrollment/domain/student_support'
import { sssPrivacy } from '#modules/enrollment/services/sss_privacy_service'
import { AssessmentService } from '#modules/enrollment/services/assessment_service'
import Scholarship from '#modules/enrollment/models/scholarship'
import Student from '#modules/enrollment/models/student'
import GradeEntry from '#modules/enrollment/models/grade_entry'

function now() {
  return DateTime.now()
}

function sqlNow() {
  return now().toSQL()!
}

export class StudentSupportService {
  async assignOfficeStaff(input: {
    organizationId: string
    userId: string
    office: SssOffice
    roleTitle?: string | null
    assignedBy: string
  }) {
    const existing = await db
      .from(t('sss_office_staff_assignments'))
      .where({ organization_id: input.organizationId, user_id: input.userId, office: input.office })
      .first()
    if (existing) {
      await db
        .from(t('sss_office_staff_assignments'))
        .where('id', existing.id)
        .update({
          is_active: true,
          role_title: input.roleTitle ?? existing.role_title,
          assigned_by: input.assignedBy,
          assigned_at: sqlNow(),
          updated_at: sqlNow(),
        })
      return existing.id
    }
    const id = randomUUID()
    await db.table(t('sss_office_staff_assignments')).insert({
      id,
      organization_id: input.organizationId,
      user_id: input.userId,
      office: input.office,
      role_title: input.roleTitle ?? null,
      is_active: true,
      assigned_by: input.assignedBy,
      assigned_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.assignedBy,
      action: 'sss.staff.assign',
      entityType: 'sss_office_staff_assignments',
      entityId: id,
      metadata: { office: input.office, userId: input.userId },
    })
    return id
  }

  async createServiceRequest(input: {
    organizationId: string
    studentId: string
    office: SssOffice
    requestType: string
    channel?: string
    summary?: string | null
    payload?: Record<string, unknown> | null
    createdBy?: string | null
  }) {
    const id = randomUUID()
    await db.table(t('sss_service_requests')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      office: input.office,
      request_type: input.requestType,
      channel: input.channel ?? 'online',
      status: 'submitted',
      assigned_to: null,
      summary: input.summary ?? null,
      payload: input.payload ? JSON.stringify(input.payload) : null,
      submitted_at: sqlNow(),
      closed_at: null,
      created_by: input.createdBy ?? null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: `sss.${input.office}.request_submitted`,
      subject: `${input.office} service request submitted`,
      payload: { requestId: id, requestType: input.requestType },
    })
    return id
  }

  async assignServiceRequest(input: {
    organizationId: string
    requestId: string
    assignedTo: string
    actorUserId: string
  }) {
    await db
      .from(t('sss_service_requests'))
      .where({ id: input.requestId, organization_id: input.organizationId })
      .update({ assigned_to: input.assignedTo, status: 'assigned', updated_at: sqlNow() })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'sss.request.assign',
      entityType: 'sss_service_requests',
      entityId: input.requestId,
      metadata: { assignedTo: input.assignedTo },
    })
  }

  async addSupportingDocument(input: {
    organizationId: string
    ownerType: string
    ownerId: string
    documentRef: string
    label?: string | null
    uploadedBy?: string | null
  }) {
    const id = randomUUID()
    await db.table(t('sss_supporting_documents')).insert({
      id,
      organization_id: input.organizationId,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      document_ref: input.documentRef,
      label: input.label ?? null,
      uploaded_by: input.uploadedBy ?? null,
      uploaded_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async issueQueueTicket(input: {
    organizationId: string
    office: SssOffice
    serviceCode: string
    studentId?: string | null
  }) {
    const count = await db
      .from(t('sss_queue_tickets'))
      .where({ organization_id: input.organizationId, office: input.office })
      .whereRaw("issued_at::date = CURRENT_DATE")
      .count('* as total')
    const seq = Number((count[0] as { total: string }).total ?? 0) + 1
    const ticketNo = `${input.office.slice(0, 3).toUpperCase()}-${String(seq).padStart(4, '0')}`
    const id = randomUUID()
    await db.table(t('sss_queue_tickets')).insert({
      id,
      organization_id: input.organizationId,
      office: input.office,
      service_code: input.serviceCode,
      ticket_no: ticketNo,
      student_id: input.studentId ?? null,
      status: 'waiting',
      called_by: null,
      issued_at: sqlNow(),
      called_at: null,
      completed_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    return { id, ticketNo }
  }

  async callQueueTicket(input: {
    organizationId: string
    ticketId: string
    calledBy: string
  }) {
    await db
      .from(t('sss_queue_tickets'))
      .where({ id: input.ticketId, organization_id: input.organizationId })
      .update({ status: 'called', called_by: input.calledBy, called_at: sqlNow(), updated_at: sqlNow() })
  }

  async createCounselingRequest(input: {
    organizationId: string
    studentId: string
    channel: 'online' | 'walk_in'
    createdBy?: string | null
  }) {
    const serviceRequestId = await this.createServiceRequest({
      organizationId: input.organizationId,
      studentId: input.studentId,
      office: 'guidance',
      requestType: 'counseling',
      channel: input.channel,
      createdBy: input.createdBy,
    })
    const id = randomUUID()
    await db.table(t('counseling_requests')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      service_request_id: serviceRequestId,
      channel: input.channel,
      status: 'submitted',
      assigned_counselor_id: null,
      requested_at: sqlNow(),
      intake_at: null,
      resolved_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    return { id, serviceRequestId }
  }

  async assignCounselor(input: {
    organizationId: string
    counselingRequestId: string
    counselorId: string
    actorUserId: string
  }) {
    await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .update({
        assigned_counselor_id: input.counselorId,
        status: 'assigned',
        intake_at: sqlNow(),
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.counseling.assign',
      entityType: 'counseling_requests',
      entityId: input.counselingRequestId,
      metadata: { counselorId: input.counselorId },
    })
  }

  async recordCounselingSession(input: {
    organizationId: string
    counselingRequestId: string
    studentId: string
    counselorId: string
    sessionType?: string
    isFollowUp?: boolean
  }) {
    const id = randomUUID()
    await db.table(t('counseling_sessions')).insert({
      id,
      organization_id: input.organizationId,
      counseling_request_id: input.counselingRequestId,
      student_id: input.studentId,
      counselor_id: input.counselorId,
      session_at: sqlNow(),
      session_type: input.sessionType ?? 'session',
      is_follow_up: input.isFollowUp ?? false,
      status: 'completed',
      created_at: sqlNow(),
      updated_at: null,
    })
    await db
      .from(t('counseling_requests'))
      .where('id', input.counselingRequestId)
      .update({ status: 'in_session', updated_at: sqlNow() })
    return id
  }

  async writeCaseNote(input: {
    organizationId: string
    counselingRequestId: string
    sessionId?: string | null
    studentId: string
    authorUserId: string
    noteBody: string
    noteKind?: string
  }) {
    const id = randomUUID()
    await db.table(t('counseling_case_notes')).insert({
      id,
      organization_id: input.organizationId,
      counseling_request_id: input.counselingRequestId,
      session_id: input.sessionId ?? null,
      student_id: input.studentId,
      author_user_id: input.authorUserId,
      note_body: input.noteBody,
      note_kind: input.noteKind ?? 'case_note',
      authored_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.authorUserId,
      action: 'guidance.case_note.write',
      entityType: 'counseling_case_notes',
      entityId: id,
      metadata: { counselingRequestId: input.counselingRequestId, noteKind: input.noteKind ?? 'case_note' },
    })
    return id
  }

  async readCaseNotes(input: {
    organizationId: string
    counselingRequestId: string
    actorUserId: string
  }) {
    const rows = await db
      .from(t('counseling_case_notes'))
      .where({
        organization_id: input.organizationId,
        counseling_request_id: input.counselingRequestId,
      })
      .orderBy('authored_at', 'asc')
    if (rows[0]) {
      await sssPrivacy.logSensitiveAccess({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        office: 'guidance',
        entityType: 'counseling_case_notes',
        entityId: input.counselingRequestId,
        studentId: rows[0].student_id,
        purpose: 'authorized_case_review',
      })
    }
    return rows
  }

  async createGuidanceReferral(input: {
    organizationId: string
    studentId: string
    fromRequestId?: string | null
    toOffice: SssOffice
    specialistType?: string | null
    reasonSummary?: string | null
    createdBy: string
  }) {
    const id = randomUUID()
    await db.table(t('guidance_referrals')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      from_request_id: input.fromRequestId ?? null,
      from_office: 'guidance',
      to_office: input.toOffice,
      specialist_type: input.specialistType ?? null,
      status: 'open',
      created_by: input.createdBy,
      reason_summary: input.reasonSummary ?? null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: 'sss.referral.created',
      payload: { referralId: id, toOffice: input.toOffice },
    })
    return id
  }

  async schedulePsychTest(input: {
    organizationId: string
    title: string
    collegeCode?: string | null
    scheduledAt: string
    venue?: string | null
    createdBy: string
  }) {
    const id = randomUUID()
    await db.table(t('psych_test_schedules')).insert({
      id,
      organization_id: input.organizationId,
      title: input.title,
      college_code: input.collegeCode ?? null,
      scheduled_at: DateTime.fromISO(input.scheduledAt).toSQL(),
      venue: input.venue ?? null,
      status: 'scheduled',
      created_by: input.createdBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async encodePsychResult(input: {
    organizationId: string
    scheduleId?: string | null
    studentId: string
    testCode: string
    encodedBy: string
  }) {
    const id = randomUUID()
    await db.table(t('psych_test_results')).insert({
      id,
      organization_id: input.organizationId,
      schedule_id: input.scheduleId ?? null,
      student_id: input.studentId,
      test_code: input.testCode,
      controlled_release: true,
      released: false,
      released_at: null,
      encoded_by: input.encodedBy,
      encoded_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async releasePsychResult(input: {
    organizationId: string
    resultId: string
    actorUserId: string
  }) {
    await db
      .from(t('psych_test_results'))
      .where({ id: input.resultId, organization_id: input.organizationId })
      .update({ released: true, released_at: sqlNow(), updated_at: sqlNow() })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.psych.release',
      entityType: 'psych_test_results',
      entityId: input.resultId,
    })
  }

  async applyShiftingExam(input: {
    organizationId: string
    studentId: string
    fromProgramCode?: string | null
    toProgramCode?: string | null
    requirementsJson?: Record<string, unknown> | null
  }) {
    const id = randomUUID()
    await db.table(t('shifting_exam_applications')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      from_program_code: input.fromProgramCode ?? null,
      to_program_code: input.toProgramCode ?? null,
      status: 'submitted',
      requirements_json: input.requirementsJson ? JSON.stringify(input.requirementsJson) : null,
      exam_scheduled_at: null,
      payment_tag: null,
      result_released: false,
      endorsement_status: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async ensureHealthRecord(input: {
    organizationId: string
    studentId: string
    openedBy?: string | null
  }) {
    const existing = await db
      .from(t('health_records'))
      .where({ organization_id: input.organizationId, student_id: input.studentId })
      .first()
    if (existing) return existing.id
    const id = randomUUID()
    await db.table(t('health_records')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      status: 'active',
      opened_at: sqlNow(),
      opened_by: input.openedBy ?? null,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async recordHealthEncounter(input: {
    organizationId: string
    studentId: string
    clinicianUserId: string
    encounterType?: string
    isEmergency?: boolean
    clinicalNote?: string | null
  }) {
    const healthRecordId = await this.ensureHealthRecord({
      organizationId: input.organizationId,
      studentId: input.studentId,
      openedBy: input.clinicianUserId,
    })
    const encounterId = randomUUID()
    await db.table(t('health_encounters')).insert({
      id: encounterId,
      organization_id: input.organizationId,
      health_record_id: healthRecordId,
      student_id: input.studentId,
      encounter_type: input.encounterType ?? 'outpatient',
      is_emergency: input.isEmergency ?? false,
      clinician_user_id: input.clinicianUserId,
      encountered_at: sqlNow(),
      status: 'completed',
      created_at: sqlNow(),
      updated_at: null,
    })
    if (input.clinicalNote) {
      await db.table(t('health_clinical_notes')).insert({
        id: randomUUID(),
        organization_id: input.organizationId,
        encounter_id: encounterId,
        student_id: input.studentId,
        author_user_id: input.clinicianUserId,
        note_body: input.clinicalNote,
        note_kind: 'consultation',
        authored_at: sqlNow(),
        created_at: sqlNow(),
        updated_at: null,
      })
      await sssPrivacy.logOperational({
        organizationId: input.organizationId,
        actorUserId: input.clinicianUserId,
        action: 'health.clinical_note.write',
        entityType: 'health_clinical_notes',
        entityId: encounterId,
        metadata: { encounterId, noteKind: 'consultation' },
      })
    }
    return { healthRecordId, encounterId }
  }

  async readClinicalNotes(input: {
    organizationId: string
    encounterId: string
    actorUserId: string
  }) {
    const rows = await db
      .from(t('health_clinical_notes'))
      .where({ organization_id: input.organizationId, encounter_id: input.encounterId })
      .orderBy('authored_at', 'asc')
    if (rows[0]) {
      await sssPrivacy.logSensitiveAccess({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        office: 'health',
        entityType: 'health_clinical_notes',
        entityId: input.encounterId,
        studentId: rows[0].student_id,
        purpose: 'authorized_clinical_review',
      })
    }
    return rows
  }

  async setHealthClearance(input: {
    organizationId: string
    studentId: string
    status: 'pending' | 'cleared' | 'denied'
    clearanceType?: string
    assessmentContext?: string | null
    decidedBy: string
    validUntil?: string | null
  }) {
    const id = randomUUID()
    await db.table(t('health_clearances')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      clearance_type: input.clearanceType ?? 'enrollment',
      status: input.status,
      assessment_context: input.assessmentContext ?? null,
      decided_by: input.decidedBy,
      decided_at: sqlNow(),
      valid_until: input.validUntil ? DateTime.fromISO(input.validUntil).toSQL() : null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: 'sss.health.clearance_updated',
      payload: { clearanceId: id, status: input.status },
    })
    return id
  }

  async recordHealthProgram(input: {
    organizationId: string
    studentId: string
    programCode: string
    status?: string
    recordedBy: string
  }) {
    const id = randomUUID()
    await db.table(t('health_program_participations')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      program_code: input.programCode,
      status: input.status ?? 'completed',
      participated_at: sqlNow(),
      recorded_by: input.recordedBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async getLatestHealthClearance(organizationId: string, studentId: string) {
    return db
      .from(t('health_clearances'))
      .where({ organization_id: organizationId, student_id: studentId, clearance_type: 'enrollment' })
      .orderBy('created_at', 'desc')
      .first()
  }

  async fileDisciplineComplaint(input: {
    organizationId: string
    respondentStudentId: string
    complainantUserId?: string | null
    complainantRole?: string | null
    summary?: string | null
  }) {
    const complaintId = randomUUID()
    await db.table(t('discipline_complaints')).insert({
      id: complaintId,
      organization_id: input.organizationId,
      respondent_student_id: input.respondentStudentId,
      complainant_user_id: input.complainantUserId ?? null,
      complainant_role: input.complainantRole ?? null,
      status: 'filed',
      summary: input.summary ?? null,
      filed_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    const caseId = randomUUID()
    await db.table(t('discipline_cases')).insert({
      id: caseId,
      organization_id: input.organizationId,
      complaint_id: complaintId,
      student_id: input.respondentStudentId,
      workflow_status: 'intake',
      sdt_engaged: false,
      assigned_to: null,
      opened_at: sqlNow(),
      closed_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.respondentStudentId,
      templateCode: 'sss.osa.discipline_notice',
      payload: { caseId, complaintId },
    })
    return { complaintId, caseId }
  }

  async advanceDisciplineCase(input: {
    organizationId: string
    caseId: string
    workflowStatus: string
    sdtEngaged?: boolean
    actorUserId: string
  }) {
    if (!DISCIPLINE_WORKFLOW_STATUSES.includes(input.workflowStatus as (typeof DISCIPLINE_WORKFLOW_STATUSES)[number])) {
      throw new EnrollmentWorkflowError('Invalid discipline workflow status', 422, 'INVALID_WORKFLOW_STATUS')
    }
    await db
      .from(t('discipline_cases'))
      .where({ id: input.caseId, organization_id: input.organizationId })
      .update({
        workflow_status: input.workflowStatus,
        sdt_engaged: input.sdtEngaged ?? false,
        closed_at: input.workflowStatus === 'closed' ? sqlNow() : null,
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'osa.discipline.advance',
      entityType: 'discipline_cases',
      entityId: input.caseId,
      metadata: { workflowStatus: input.workflowStatus },
    })
  }

  async recordSanction(input: {
    organizationId: string
    caseId: string
    studentId: string
    sanctionCode: string
    label: string
    recordedBy: string
  }) {
    const id = randomUUID()
    await db.table(t('discipline_sanctions')).insert({
      id,
      organization_id: input.organizationId,
      case_id: input.caseId,
      student_id: input.studentId,
      sanction_code: input.sanctionCode,
      label: input.label,
      effective_from: sqlNow(),
      effective_to: null,
      recorded_by: input.recordedBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async submitOrgApplication(input: {
    organizationId: string
    proposedName: string
    applicationType: 'new' | 'renewal'
    submittedBy: string
    requirementsJson?: Record<string, unknown> | null
  }) {
    const id = randomUUID()
    await db.table(t('org_applications')).insert({
      id,
      organization_id: input.organizationId,
      student_org_id: null,
      application_type: input.applicationType,
      proposed_name: input.proposedName,
      workflow_status: 'osa',
      submitted_by: input.submittedBy,
      requirements_json: input.requirementsJson ? JSON.stringify(input.requirementsJson) : null,
      submitted_at: sqlNow(),
      decided_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async advanceOrgApplication(input: {
    organizationId: string
    applicationId: string
    workflowStatus: string
    actorUserId: string
    issueCertificateRef?: string | null
  }) {
    if (!ORG_ACCREDITATION_STATUSES.includes(input.workflowStatus as (typeof ORG_ACCREDITATION_STATUSES)[number])) {
      throw new EnrollmentWorkflowError('Invalid organization workflow status', 422, 'INVALID_WORKFLOW_STATUS')
    }
    const app = await db
      .from(t('org_applications'))
      .where({ id: input.applicationId, organization_id: input.organizationId })
      .first()
    if (!app) throw new EnrollmentWorkflowError('Organization application not found', 404, 'NOT_FOUND')

    let studentOrgId = app.student_org_id
    if (input.workflowStatus === 'accredited') {
      studentOrgId = randomUUID()
      const code = `ORG-${Date.now().toString(36).toUpperCase()}`
      await db.table(t('student_organizations')).insert({
        id: studentOrgId,
        organization_id: input.organizationId,
        code,
        name: app.proposed_name,
        status: 'active',
        accredited_at: sqlNow(),
        accreditation_certificate_ref: input.issueCertificateRef ?? null,
        created_at: sqlNow(),
        updated_at: null,
      })
    }

    await db
      .from(t('org_applications'))
      .where('id', input.applicationId)
      .update({
        workflow_status: input.workflowStatus,
        student_org_id: studentOrgId,
        decided_at: ['accredited', 'rejected'].includes(input.workflowStatus) ? sqlNow() : null,
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'osa.org.advance',
      entityType: 'org_applications',
      entityId: input.applicationId,
      metadata: { workflowStatus: input.workflowStatus },
    })
    return studentOrgId
  }

  async requestStudentId(input: {
    organizationId: string
    studentId: string
    requestType: 'new' | 'replacement'
  }) {
    const id = randomUUID()
    await db.table(t('student_id_requests')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      request_type: input.requestType,
      status: 'submitted',
      rfid_ref: null,
      payment_validation_ref: null,
      print_unit_status: 'pending',
      submitted_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async updateStudentIdRequest(input: {
    organizationId: string
    requestId: string
    status?: string
    rfidRef?: string | null
    paymentValidationRef?: string | null
    printUnitStatus?: string | null
    actorUserId: string
  }) {
    await db
      .from(t('student_id_requests'))
      .where({ id: input.requestId, organization_id: input.organizationId })
      .update({
        status: input.status ?? undefined,
        rfid_ref: input.rfidRef ?? undefined,
        payment_validation_ref: input.paymentValidationRef ?? undefined,
        print_unit_status: input.printUnitStatus ?? undefined,
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'osa.student_id.update',
      entityType: 'student_id_requests',
      entityId: input.requestId,
      metadata: { status: input.status },
    })
  }

  async upsertScholarshipProgram(input: {
    organizationId: string
    code: string
    name: string
    sourceType: 'internal' | 'external'
    eligibilityConfig?: Record<string, unknown> | null
    coverageConfig?: Record<string, unknown> | null
  }) {
    const existing = await db
      .from(t('scholarship_programs'))
      .where({ organization_id: input.organizationId, code: input.code })
      .first()
    if (existing) {
      await db
        .from(t('scholarship_programs'))
        .where('id', existing.id)
        .update({
          name: input.name,
          source_type: input.sourceType,
          eligibility_config: input.eligibilityConfig ? JSON.stringify(input.eligibilityConfig) : existing.eligibility_config,
          coverage_config: input.coverageConfig ? JSON.stringify(input.coverageConfig) : existing.coverage_config,
          is_active: true,
          updated_at: sqlNow(),
        })
      return existing.id
    }
    const id = randomUUID()
    await db.table(t('scholarship_programs')).insert({
      id,
      organization_id: input.organizationId,
      code: input.code,
      name: input.name,
      source_type: input.sourceType,
      is_active: true,
      eligibility_config: input.eligibilityConfig ? JSON.stringify(input.eligibilityConfig) : null,
      coverage_config: input.coverageConfig ? JSON.stringify(input.coverageConfig) : null,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async applyScholarship(input: {
    organizationId: string
    programId: string
    studentId: string
    incomeClassification?: string | null
    requirementsJson?: Record<string, unknown> | null
    submittedBy?: string | null
  }) {
    const program = await db
      .from(t('scholarship_programs'))
      .where({ id: input.programId, organization_id: input.organizationId, is_active: true })
      .first()
    if (!program) throw new EnrollmentWorkflowError('Scholarship program not found', 404, 'NOT_FOUND')

    const eligibilitySnapshot = await this.buildEligibilitySnapshot(
      input.organizationId,
      input.studentId,
      program.eligibility_config
    )

    const id = randomUUID()
    await db.table(t('scholarship_applications')).insert({
      id,
      organization_id: input.organizationId,
      program_id: input.programId,
      student_id: input.studentId,
      status: 'submitted',
      income_classification: input.incomeClassification ?? null,
      eligibility_snapshot: JSON.stringify(eligibilitySnapshot),
      requirements_json: input.requirementsJson ? JSON.stringify(input.requirementsJson) : null,
      submitted_by: input.submittedBy ?? null,
      submitted_at: sqlNow(),
      decided_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: 'sss.scholarship.application_submitted',
      payload: { applicationId: id, programCode: program.code },
    })
    return { id, eligibilitySnapshot }
  }

  private async buildEligibilitySnapshot(
    organizationId: string,
    studentId: string,
    eligibilityConfigRaw: unknown
  ) {
    const student = await Student.findOrFail(studentId)
    const grades = await GradeEntry.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .whereIn('status', ['submitted', 'locked'])
    const config =
      typeof eligibilityConfigRaw === 'string'
        ? JSON.parse(eligibilityConfigRaw)
        : (eligibilityConfigRaw as Record<string, unknown> | null)

    return {
      studentNumber: student.studentNumber,
      programId: student.programId,
      yearLevel: student.yearLevel,
      lockedGradeCount: grades.length,
      eligibilityConfigPresent: Boolean(config),
      note: 'Threshold evaluation uses office-configured eligibility_config only; no hard-coded university cutoffs.',
      configKeys: config ? Object.keys(config) : [],
    }
  }

  async evaluateScholarship(input: {
    organizationId: string
    applicationId: string
    evaluatorUserId: string
    decision: 'recommend_approve' | 'recommend_reject' | 'needs_info'
    notes?: string | null
  }) {
    const id = randomUUID()
    await db.table(t('scholarship_evaluations')).insert({
      id,
      organization_id: input.organizationId,
      application_id: input.applicationId,
      evaluator_user_id: input.evaluatorUserId,
      decision: input.decision,
      notes: input.notes ?? null,
      evaluated_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    await db
      .from(t('scholarship_applications'))
      .where('id', input.applicationId)
      .update({
        status: input.decision === 'needs_info' ? 'needs_info' : 'evaluated',
        updated_at: sqlNow(),
      })
    return id
  }

  async decideScholarship(input: {
    organizationId: string
    applicationId: string
    approve: boolean
    actorUserId: string
    awardAmount?: number
    enrollmentId?: string | null
  }) {
    const app = await db
      .from(t('scholarship_applications'))
      .where({ id: input.applicationId, organization_id: input.organizationId })
      .first()
    if (!app) throw new EnrollmentWorkflowError('Scholarship application not found', 404, 'NOT_FOUND')
    const program = await db.from(t('scholarship_programs')).where('id', app.program_id).first()
    if (!program) throw new EnrollmentWorkflowError('Scholarship program not found', 404, 'NOT_FOUND')

    if (!input.approve) {
      await db
        .from(t('scholarship_applications'))
        .where('id', input.applicationId)
        .update({ status: 'rejected', decided_at: sqlNow(), updated_at: sqlNow() })
      await sssPrivacy.enqueueNotification({
        organizationId: input.organizationId,
        studentId: app.student_id,
        templateCode: 'sss.scholarship.rejected',
        payload: { applicationId: input.applicationId },
      })
      return { awarded: false }
    }

    await db
      .from(t('scholarship_applications'))
      .where('id', input.applicationId)
      .update({ status: 'approved', decided_at: sqlNow(), updated_at: sqlNow() })

    const amount = Number(input.awardAmount ?? 0)
    const award = await Scholarship.create({
      organizationId: input.organizationId,
      studentId: app.student_id,
      scholarshipCode: program.code,
      name: program.name,
      amount,
      status: 'active',
      awardedAt: now(),
      programId: program.id,
      applicationId: app.id,
      awardStatus: 'awarded',
    })

    const assessment = new AssessmentService()
    const coverage =
      typeof program.coverage_config === 'string'
        ? JSON.parse(program.coverage_config)
        : (program.coverage_config as Record<string, unknown> | null)
    const tagValue = Number(coverage?.fixedAmount ?? amount)
    const calc = String(coverage?.calculationMethod ?? 'fixed') as 'fixed' | 'percent'

    await assessment.tagAid({
      organizationId: input.organizationId,
      studentId: app.student_id,
      enrollmentId: input.enrollmentId ?? null,
      tagType: 'scholarship',
      code: program.code,
      name: program.name,
      calculationMethod: calc === 'percent' ? 'percent' : 'fixed',
      value: tagValue,
      notes: `Award from application ${app.id}`,
      taggedBy: input.actorUserId,
    })

    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: app.student_id,
      templateCode: 'sss.scholarship.approved',
      payload: { applicationId: input.applicationId, awardId: award.id },
    })

    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'scholarship.approve',
      entityType: 'scholarship_applications',
      entityId: input.applicationId,
      metadata: { awardId: award.id, programCode: program.code },
    })

    return { awarded: true, award }
  }

  async submitSaApplication(input: {
    organizationId: string
    studentId: string
    requirementsJson?: Record<string, unknown> | null
  }) {
    const id = randomUUID()
    await db.table(t('student_assistant_applications')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      workflow_status: 'submitted',
      requirements_json: input.requirementsJson ? JSON.stringify(input.requirementsJson) : null,
      deployment_office: null,
      interview_at: null,
      submitted_at: sqlNow(),
      decided_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    return id
  }

  async advanceSaApplication(input: {
    organizationId: string
    applicationId: string
    workflowStatus: string
    deploymentOffice?: string | null
    actorUserId: string
  }) {
    if (!SA_WORKFLOW_STATUSES.includes(input.workflowStatus as (typeof SA_WORKFLOW_STATUSES)[number])) {
      throw new EnrollmentWorkflowError('Invalid SA workflow status', 422, 'INVALID_WORKFLOW_STATUS')
    }
    await db
      .from(t('student_assistant_applications'))
      .where({ id: input.applicationId, organization_id: input.organizationId })
      .update({
        workflow_status: input.workflowStatus,
        deployment_office: input.deploymentOffice ?? null,
        decided_at: ['deployed', 'rejected'].includes(input.workflowStatus) ? sqlNow() : null,
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'scholarship.sa.advance',
      entityType: 'student_assistant_applications',
      entityId: input.applicationId,
      metadata: { workflowStatus: input.workflowStatus },
    })
  }

  async clearanceHints(organizationId: string, studentId: string) {
    const pendingCounseling = await db
      .from(t('counseling_requests'))
      .where({ organization_id: organizationId, student_id: studentId })
      .whereNotIn('status', ['resolved', 'closed', 'cancelled'])
      .first()
    const health = await this.getLatestHealthClearance(organizationId, studentId)
    const openDiscipline = await db
      .from(t('discipline_cases'))
      .where({ organization_id: organizationId, student_id: studentId })
      .whereNot('workflow_status', 'closed')
      .first()
    const scholarshipObligations = await Scholarship.query()
      .where({ organization_id: organizationId, student_id: studentId, status: 'active' })

    return {
      guidance: { pendingCounselingCases: Boolean(pendingCounseling) },
      health: { clearanceStatus: health?.status ?? 'unknown' },
      osa: { openDisciplinaryCases: Boolean(openDiscipline) },
      scholarship: { activeAwards: scholarshipObligations.length },
      note: 'ENR-063 clearance gate semantics [CONFIRM] with Registrar/offices before blocking enrollment.',
    }
  }

  async officeReport(organizationId: string, office: SssOffice) {
    const openRequests = await db
      .from(t('sss_service_requests'))
      .where({ organization_id: organizationId, office })
      .whereNotIn('status', ['closed', 'cancelled'])
      .count('* as total')
    const queueWaiting = await db
      .from(t('sss_queue_tickets'))
      .where({ organization_id: organizationId, office, status: 'waiting' })
      .count('* as total')

    const recentRequests = await db
      .from(`${t('sss_service_requests')} as sr`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'sr.student_id')
      .where('sr.organization_id', organizationId)
      .where('sr.office', office)
      .whereNotIn('sr.status', ['closed', 'cancelled'])
      .select(
        'sr.id',
        'sr.student_id',
        'sr.request_type',
        'sr.channel',
        'sr.status',
        'sr.submitted_at',
        'st.student_number',
        'st.first_name',
        'st.last_name'
      )
      .orderBy('sr.submitted_at', 'desc')
      .limit(25)

    const waitingTickets = await db
      .from(`${t('sss_queue_tickets')} as qt`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'qt.student_id')
      .where('qt.organization_id', organizationId)
      .where('qt.office', office)
      .where('qt.status', 'waiting')
      .select(
        'qt.id',
        'qt.ticket_no',
        'qt.service_code',
        'qt.student_id',
        'qt.created_at',
        'st.student_number',
        'st.first_name',
        'st.last_name'
      )
      .orderBy('qt.created_at', 'asc')
      .limit(25)

    return {
      office,
      openServiceRequests: Number((openRequests[0] as { total: string }).total ?? 0),
      queueWaiting: Number((queueWaiting[0] as { total: string }).total ?? 0),
      recentRequests: recentRequests.map((row) => ({
        id: String(row.id),
        studentId: String(row.student_id),
        studentNumber: row.student_number ? String(row.student_number) : null,
        studentName:
          row.first_name || row.last_name
            ? `${String(row.last_name ?? '')}, ${String(row.first_name ?? '')}`.replace(/^,\s*|,\s*$/g, '').trim()
            : null,
        requestType: String(row.request_type),
        channel: String(row.channel),
        status: String(row.status),
        submittedAt: row.submitted_at ? String(row.submitted_at) : null,
      })),
      waitingTickets: waitingTickets.map((row) => ({
        id: String(row.id),
        ticketNo: String(row.ticket_no),
        serviceCode: String(row.service_code),
        studentId: row.student_id ? String(row.student_id) : null,
        studentNumber: row.student_number ? String(row.student_number) : null,
        studentName:
          row.first_name || row.last_name
            ? `${String(row.last_name ?? '')}, ${String(row.first_name ?? '')}`.replace(/^,\s*|,\s*$/g, '').trim()
            : null,
        createdAt: row.created_at ? String(row.created_at) : null,
      })),
    }
  }
}
