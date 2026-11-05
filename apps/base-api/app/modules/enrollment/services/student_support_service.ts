import { DateTime } from 'luxon'
import { createHash, randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import {
  COUNSELING_NOTE_KINDS,
  COUNSELING_REQUEST_STATUSES,
  COUNSELING_REQUEST_TRANSITIONS,
  COUNSELING_SPECIALIST_CODES,
  COUNSELING_SPECIALIST_TYPES,
  QUEUE_OFFICES,
  QUEUE_TICKET_STATUSES,
  QUEUE_TICKET_TRANSITIONS,
  DISCIPLINE_SANCTION_CATALOG,
  type QueueOffice,
  DISCIPLINE_SANCTION_CODES,
  DISCIPLINE_WORKFLOW_STATUSES,
  DISCIPLINE_WORKFLOW_TRANSITIONS,
  ORG_ACCREDITATION_STATUSES,
  ORG_ACCREDITATION_TRANSITIONS,
  ORG_REQUIREMENT_KEYS_DEFAULT,
  PSYCH_SCHEDULE_STATUSES,
  PSYCH_TEST_BATTERY_CATALOG,
  PSYCH_TEST_CODES,
  SA_REQUIREMENT_KEYS_DEFAULT,
  SA_WORKFLOW_STATUSES,
  SA_WORKFLOW_TRANSITIONS,
  HEALTH_PROGRAM_CATALOG,
  HEALTH_PROGRAM_CODES,
  HEALTH_PROGRAM_STATUSES,
  MEDICAL_ASSESSMENT_CONTEXTS,
  SHIFTING_ENDORSEMENT_PARTIES,
  SHIFTING_EXAM_TRANSITIONS,
  SHIFTING_REQUIREMENT_KEYS_DEFAULT,
  STUDENT_ID_REQUEST_STATUSES,
  STUDENT_ID_REQUEST_TRANSITIONS,
  STUDENT_ID_REQUEST_TYPES,
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

function digitalIdStableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => digitalIdStableStringify(item)).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${digitalIdStableStringify(obj[key])}`).join(',')}}`
}

function digitalIdChecksum(snapshot: Record<string, unknown>) {
  return createHash('sha256').update(digitalIdStableStringify(snapshot)).digest('hex')
}

function digitalIdPublicWebBase() {
  return (process.env.ENROLLMENT_WEB_URL ?? 'http://127.0.0.1:5180').replace(/\/$/, '')
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

  private serializeQueueTicket(row: Record<string, unknown>, student?: Record<string, unknown> | null) {
    const status = String(row.status)
    const issuedAt = row.issued_at ? DateTime.fromJSDate(new Date(String(row.issued_at))) : null
    const calledAt = row.called_at ? DateTime.fromJSDate(new Date(String(row.called_at))) : null
    const completedAt = row.completed_at ? DateTime.fromJSDate(new Date(String(row.completed_at))) : null
    const waitSeconds =
      issuedAt?.isValid && calledAt?.isValid
        ? Math.max(0, Math.round(calledAt.diff(issuedAt, 'seconds').seconds))
        : null
    const serviceSeconds =
      calledAt?.isValid && completedAt?.isValid
        ? Math.max(0, Math.round(completedAt.diff(calledAt, 'seconds').seconds))
        : null
    return {
      id: row.id,
      office: row.office,
      serviceCode: row.service_code,
      ticketNo: row.ticket_no,
      studentId: row.student_id,
      studentNumber: student?.student_number ? String(student.student_number) : null,
      studentName:
        student?.first_name || student?.last_name
          ? `${String(student.last_name ?? '')}, ${String(student.first_name ?? '')}`.replace(/^,\s*|,\s*$/g, '').trim()
          : null,
      status,
      calledBy: row.called_by,
      issuedAt: row.issued_at,
      calledAt: row.called_at,
      completedAt: row.completed_at,
      waitSeconds,
      serviceSeconds,
      allowedNextStatuses: QUEUE_TICKET_TRANSITIONS[status] ?? [],
      note: 'ENR-064 software queue track; slip printing hardware VI.E.1.3 out of scope (PDF slip available).',
    }
  }

  async issueQueueTicket(input: {
    organizationId: string
    office: QueueOffice
    serviceCode: string
    studentId?: string | null
    actorUserId?: string | null
  }) {
    if (!QUEUE_OFFICES.includes(input.office)) {
      throw new EnrollmentWorkflowError('Invalid queue office', 422, 'INVALID_QUEUE_OFFICE')
    }
    const day = DateTime.now().toFormat('yyyyMMdd')
    const prefix = `${input.office.slice(0, 3).toUpperCase()}-${day}-`
    const count = await db
      .from(t('sss_queue_tickets'))
      .where({ organization_id: input.organizationId, office: input.office })
      .where('ticket_no', 'like', `${prefix}%`)
      .count('* as total')
    const seq = Number((count[0] as { total: string }).total ?? 0) + 1
    const ticketNo = `${prefix}${String(seq).padStart(4, '0')}`
    const id = randomUUID()
    try {
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
    } catch {
      throw new EnrollmentWorkflowError(
        'Could not issue queue ticket (number collision). Retry.',
        409,
        'QUEUE_TICKET_CONFLICT'
      )
    }
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: 'queue.ticket.issue',
      entityType: 'sss_queue_tickets',
      entityId: id,
      metadata: {
        office: input.office,
        ticketNo,
        serviceCode: input.serviceCode,
        studentId: input.studentId ?? null,
      },
    })
    return this.getQueueTicket(input.organizationId, id)
  }

  async getQueueTicket(organizationId: string, ticketId: string) {
    const row = await db
      .from(`${t('sss_queue_tickets')} as qt`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'qt.student_id')
      .where('qt.organization_id', organizationId)
      .where('qt.id', ticketId)
      .select(
        'qt.*',
        'st.student_number',
        'st.first_name',
        'st.last_name'
      )
      .first()
    if (!row) throw new EnrollmentWorkflowError('Queue ticket not found', 404, 'NOT_FOUND')
    return this.serializeQueueTicket(row, row)
  }

  async listQueueTickets(
    organizationId: string,
    filters?: { office?: QueueOffice; status?: string; studentId?: string; todayOnly?: boolean }
  ) {
    const q = db
      .from(`${t('sss_queue_tickets')} as qt`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'qt.student_id')
      .where('qt.organization_id', organizationId)
      .select('qt.*', 'st.student_number', 'st.first_name', 'st.last_name')
      .orderBy('qt.issued_at', 'asc')
    if (filters?.office) q.where('qt.office', filters.office)
    if (filters?.status) q.where('qt.status', filters.status)
    if (filters?.studentId) q.where('qt.student_id', filters.studentId)
    if (filters?.todayOnly !== false) q.whereRaw('qt.issued_at::date = CURRENT_DATE')
    const rows = await q.limit(200)
    return rows.map((r) => this.serializeQueueTicket(r, r))
  }

  async queueDisplayStatus(organizationId: string, office: QueueOffice) {
    if (!QUEUE_OFFICES.includes(office)) {
      throw new EnrollmentWorkflowError('Invalid queue office', 422, 'INVALID_QUEUE_OFFICE')
    }
    const tickets = await this.listQueueTickets(organizationId, { office, todayOnly: true })
    const waiting = tickets.filter((t) => t.status === 'waiting')
    const called = tickets.filter((t) => t.status === 'called')
    const completed = tickets.filter((t) => t.status === 'completed')
    return {
      office,
      asOf: DateTime.now().toISO(),
      waitingCount: waiting.length,
      calledCount: called.length,
      completedToday: completed.length,
      nowServing: called.slice(-3).reverse(),
      nextWaiting: waiting.slice(0, 10),
      note: 'ENR-064 display board (software). Hardware display units VI.E.1.3 remain out of scope.',
    }
  }

  async advanceQueueTicket(input: {
    organizationId: string
    ticketId: string
    status: string
    actorUserId: string
  }) {
    if (!QUEUE_TICKET_STATUSES.includes(input.status as (typeof QUEUE_TICKET_STATUSES)[number])) {
      throw new EnrollmentWorkflowError('Invalid queue ticket status', 422, 'INVALID_QUEUE_STATUS')
    }
    const row = await db
      .from(t('sss_queue_tickets'))
      .where({ id: input.ticketId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Queue ticket not found', 404, 'NOT_FOUND')
    const allowed = QUEUE_TICKET_TRANSITIONS[row.status] ?? []
    if (!allowed.includes(input.status)) {
      throw new EnrollmentWorkflowError(
        `Cannot transition queue ${row.status} → ${input.status}`,
        422,
        'INVALID_QUEUE_TRANSITION'
      )
    }
    const patch: Record<string, unknown> = {
      status: input.status,
      updated_at: sqlNow(),
    }
    if (input.status === 'called') {
      patch.called_by = input.actorUserId
      patch.called_at = sqlNow()
    }
    if (input.status === 'completed') {
      patch.completed_at = sqlNow()
      if (!row.called_at) {
        patch.called_by = input.actorUserId
        patch.called_at = sqlNow()
      }
    }
    if (input.status === 'waiting') {
      patch.called_by = null
      patch.called_at = null
      patch.completed_at = null
    }
    if (input.status === 'skipped' || input.status === 'cancelled') {
      patch.completed_at = sqlNow()
    }
    await db
      .from(t('sss_queue_tickets'))
      .where({ id: input.ticketId, organization_id: input.organizationId })
      .update(patch)
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'queue.ticket.advance',
      entityType: 'sss_queue_tickets',
      entityId: input.ticketId,
      metadata: { from: row.status, status: input.status },
    })
    return this.getQueueTicket(input.organizationId, input.ticketId)
  }

  async callQueueTicket(input: {
    organizationId: string
    ticketId: string
    calledBy: string
  }) {
    return this.advanceQueueTicket({
      organizationId: input.organizationId,
      ticketId: input.ticketId,
      status: 'called',
      actorUserId: input.calledBy,
    })
  }

  async queueAnalyticsReport(organizationId: string, office?: QueueOffice) {
    const tickets = await this.listQueueTickets(organizationId, {
      office,
      todayOnly: false,
    })
    const byOffice: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    let waitSum = 0
    let waitN = 0
    let serviceSum = 0
    let serviceN = 0
    for (const ticket of tickets) {
      const officeKey = String(ticket.office)
      byOffice[officeKey] = (byOffice[officeKey] ?? 0) + 1
      byStatus[ticket.status] = (byStatus[ticket.status] ?? 0) + 1
      if (typeof ticket.waitSeconds === 'number') {
        waitSum += ticket.waitSeconds
        waitN += 1
      }
      if (typeof ticket.serviceSeconds === 'number') {
        serviceSum += ticket.serviceSeconds
        serviceN += 1
      }
    }
    return {
      totalTickets: tickets.length,
      byOffice: Object.entries(byOffice).map(([officeCode, total]) => ({ office: officeCode, total })),
      byStatus: Object.entries(byStatus).map(([status, total]) => ({ status, total })),
      avgWaitSeconds: waitN ? Math.round(waitSum / waitN) : null,
      avgServiceSeconds: serviceN ? Math.round(serviceSum / serviceN) : null,
      offices: [...QUEUE_OFFICES],
      note: 'ENR-064 analytics (software). Counter topology / hardware printers [CONFIRM] / VI.E.1.3 out of scope.',
    }
  }

  async queueTicketSlipPdf(organizationId: string, ticketId: string) {
    const ticket = await this.getQueueTicket(organizationId, ticketId)
    const { rowsToSimplePdf } = await import('#modules/enrollment/services/report_export')
    const body = rowsToSimplePdf(
      'WMSU USiS — Queue ticket slip (ENR-064)',
      [
        {
          ticketNo: ticket.ticketNo,
          office: ticket.office,
          serviceCode: ticket.serviceCode,
          status: ticket.status,
          student: ticket.studentNumber ?? ticket.studentName ?? 'Walk-in',
          issuedAt: ticket.issuedAt,
        },
      ],
      [
        'Software printable slip. Hardware slip printers and public display boards are TOR VI.E.1.3 (out of software scope).',
        'Present this ticket number at the counter when called.',
      ]
    )
    const slug = String(ticket.ticketNo).replace(/[^a-zA-Z0-9_-]+/g, '_')
    return {
      contentType: 'application/pdf',
      filename: `queue-slip-${slug}.pdf`,
      body,
      meta: ticket,
    }
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

  private serializeCounselingRequest(
    row: Record<string, unknown>,
    extras?: {
      sessionCount?: number
      noteCount?: number
      openReferralCount?: number
      sessions?: Array<Record<string, unknown>>
      referrals?: Array<Record<string, unknown>>
    }
  ) {
    const status = String(row.status)
    return {
      id: row.id,
      studentId: row.student_id,
      serviceRequestId: row.service_request_id,
      channel: row.channel,
      status,
      assignedCounselorId: row.assigned_counselor_id,
      requestedAt: row.requested_at,
      intakeAt: row.intake_at,
      resolvedAt: row.resolved_at,
      allowedNextStatuses: COUNSELING_REQUEST_TRANSITIONS[status] ?? [],
      sessionCount: extras?.sessionCount ?? 0,
      noteCount: extras?.noteCount ?? 0,
      openReferralCount: extras?.openReferralCount ?? 0,
      sessions: (extras?.sessions ?? []).map((s) => ({
        id: s.id,
        sessionAt: s.session_at,
        sessionType: s.session_type,
        isFollowUp: Boolean(s.is_follow_up),
        status: s.status,
        counselorId: s.counselor_id,
      })),
      referrals: (extras?.referrals ?? []).map((r) => ({
        id: r.id,
        toOffice: r.to_office,
        specialistType: r.specialist_type,
        status: r.status,
        reasonSummary: r.reason_summary,
        createdAt: r.created_at,
      })),
      note: 'ENR-055 case-note retention / access policy [CONFIRM]. Note bodies are never included in operational payloads.',
    }
  }

  async listCounselingRequests(
    organizationId: string,
    filters?: { studentId?: string; status?: string; openOnly?: boolean }
  ) {
    const q = db
      .from(t('counseling_requests'))
      .where({ organization_id: organizationId })
      .orderBy('requested_at', 'desc')
    if (filters?.studentId) q.where('student_id', filters.studentId)
    if (filters?.status) q.where('status', filters.status)
    if (filters?.openOnly) q.whereNot('status', 'resolved')
    const rows = await q.limit(100)
    if (!rows.length) return []
    const ids = rows.map((r) => r.id)
    const sessions = await db
      .from(t('counseling_sessions'))
      .where({ organization_id: organizationId })
      .whereIn('counseling_request_id', ids)
    const notes = await db
      .from(t('counseling_case_notes'))
      .where({ organization_id: organizationId })
      .whereIn('counseling_request_id', ids)
      .select('id', 'counseling_request_id')
    const referrals = await db
      .from(t('guidance_referrals'))
      .where({ organization_id: organizationId })
      .whereIn('from_request_id', ids)
    const sessionCount = new Map<string, number>()
    const noteCount = new Map<string, number>()
    const openReferralCount = new Map<string, number>()
    for (const s of sessions) {
      const key = String(s.counseling_request_id)
      sessionCount.set(key, (sessionCount.get(key) ?? 0) + 1)
    }
    for (const n of notes) {
      const key = String(n.counseling_request_id)
      noteCount.set(key, (noteCount.get(key) ?? 0) + 1)
    }
    for (const r of referrals) {
      if (String(r.status) !== 'open') continue
      const key = String(r.from_request_id)
      openReferralCount.set(key, (openReferralCount.get(key) ?? 0) + 1)
    }
    return rows.map((r) =>
      this.serializeCounselingRequest(r, {
        sessionCount: sessionCount.get(String(r.id)) ?? 0,
        noteCount: noteCount.get(String(r.id)) ?? 0,
        openReferralCount: openReferralCount.get(String(r.id)) ?? 0,
      })
    )
  }

  async getCounselingRequest(organizationId: string, counselingRequestId: string) {
    const row = await db
      .from(t('counseling_requests'))
      .where({ id: counselingRequestId, organization_id: organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Counseling request not found', 404, 'NOT_FOUND')
    const sessions = await db
      .from(t('counseling_sessions'))
      .where({ counseling_request_id: counselingRequestId, organization_id: organizationId })
      .orderBy('session_at', 'asc')
    const notes = await db
      .from(t('counseling_case_notes'))
      .where({ counseling_request_id: counselingRequestId, organization_id: organizationId })
      .select('id')
    const referrals = await db
      .from(t('guidance_referrals'))
      .where({ from_request_id: counselingRequestId, organization_id: organizationId })
      .orderBy('created_at', 'asc')
    return this.serializeCounselingRequest(row, {
      sessionCount: sessions.length,
      noteCount: notes.length,
      openReferralCount: referrals.filter((r) => String(r.status) === 'open').length,
      sessions,
      referrals,
    })
  }

  async documentCounselingIntake(input: {
    organizationId: string
    counselingRequestId: string
    actorUserId: string
    intakeSummary: string
  }) {
    const row = await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Counseling request not found', 404, 'NOT_FOUND')
    const allowed = COUNSELING_REQUEST_TRANSITIONS[row.status] ?? []
    if (!allowed.includes('intake') && row.status !== 'intake') {
      throw new EnrollmentWorkflowError(
        `Cannot document intake from status ${row.status}`,
        422,
        'INVALID_COUNSELING_TRANSITION'
      )
    }
    if (row.status !== 'intake') {
      await db
        .from(t('counseling_requests'))
        .where({ id: input.counselingRequestId, organization_id: input.organizationId })
        .update({
          status: 'intake',
          intake_at: sqlNow(),
          updated_at: sqlNow(),
        })
    } else if (!row.intake_at) {
      await db
        .from(t('counseling_requests'))
        .where({ id: input.counselingRequestId, organization_id: input.organizationId })
        .update({ intake_at: sqlNow(), updated_at: sqlNow() })
    }
    await this.writeCaseNote({
      organizationId: input.organizationId,
      counselingRequestId: input.counselingRequestId,
      studentId: String(row.student_id),
      authorUserId: input.actorUserId,
      noteBody: input.intakeSummary,
      noteKind: 'intake',
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.counseling.intake',
      entityType: 'counseling_requests',
      entityId: input.counselingRequestId,
      metadata: { status: 'intake' },
    })
    return this.getCounselingRequest(input.organizationId, input.counselingRequestId)
  }

  async assignCounselor(input: {
    organizationId: string
    counselingRequestId: string
    counselorId: string
    actorUserId: string
  }) {
    const row = await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Counseling request not found', 404, 'NOT_FOUND')
    const allowed = COUNSELING_REQUEST_TRANSITIONS[row.status] ?? []
    if (!allowed.includes('assigned')) {
      throw new EnrollmentWorkflowError(
        `Cannot assign counselor from status ${row.status}`,
        422,
        'INVALID_COUNSELING_TRANSITION'
      )
    }
    await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .update({
        assigned_counselor_id: input.counselorId,
        status: 'assigned',
        intake_at: row.intake_at ?? sqlNow(),
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
    return this.getCounselingRequest(input.organizationId, input.counselingRequestId)
  }

  async recordCounselingSession(input: {
    organizationId: string
    counselingRequestId: string
    counselorId: string
    sessionType?: string
    isFollowUp?: boolean
    noteBody?: string | null
    actorUserId: string
  }) {
    const row = await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Counseling request not found', 404, 'NOT_FOUND')
    const nextStatus = input.isFollowUp ? 'follow_up' : 'in_session'
    const allowed = COUNSELING_REQUEST_TRANSITIONS[row.status] ?? []
    if (!allowed.includes(nextStatus) && row.status !== nextStatus) {
      throw new EnrollmentWorkflowError(
        `Cannot record ${nextStatus} from status ${row.status}`,
        422,
        'INVALID_COUNSELING_TRANSITION'
      )
    }
    const id = randomUUID()
    await db.table(t('counseling_sessions')).insert({
      id,
      organization_id: input.organizationId,
      counseling_request_id: input.counselingRequestId,
      student_id: row.student_id,
      counselor_id: input.counselorId,
      session_at: sqlNow(),
      session_type: input.sessionType ?? (input.isFollowUp ? 'follow_up' : 'session'),
      is_follow_up: input.isFollowUp ?? false,
      status: 'completed',
      created_at: sqlNow(),
      updated_at: null,
    })
    await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .update({ status: nextStatus, updated_at: sqlNow() })
    if (input.noteBody?.trim()) {
      await this.writeCaseNote({
        organizationId: input.organizationId,
        counselingRequestId: input.counselingRequestId,
        sessionId: id,
        studentId: String(row.student_id),
        authorUserId: input.actorUserId,
        noteBody: input.noteBody.trim(),
        noteKind: input.isFollowUp ? 'follow_up' : 'session',
      })
    }
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.counseling.session',
      entityType: 'counseling_sessions',
      entityId: id,
      metadata: { counselingRequestId: input.counselingRequestId, isFollowUp: Boolean(input.isFollowUp) },
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: String(row.student_id),
      templateCode: 'sss.guidance.session_recorded',
      payload: { counselingRequestId: input.counselingRequestId, sessionId: id, isFollowUp: Boolean(input.isFollowUp) },
    })
    return this.getCounselingRequest(input.organizationId, input.counselingRequestId)
  }

  async writeCaseNote(input: {
    organizationId: string
    counselingRequestId: string
    sessionId?: string | null
    studentId?: string
    authorUserId: string
    noteBody: string
    noteKind?: string
  }) {
    const kind = input.noteKind ?? 'case_note'
    if (!COUNSELING_NOTE_KINDS.includes(kind as (typeof COUNSELING_NOTE_KINDS)[number])) {
      throw new EnrollmentWorkflowError('Invalid counseling note kind', 422, 'INVALID_NOTE_KIND')
    }
    const row = await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Counseling request not found', 404, 'NOT_FOUND')
    const id = randomUUID()
    await db.table(t('counseling_case_notes')).insert({
      id,
      organization_id: input.organizationId,
      counseling_request_id: input.counselingRequestId,
      session_id: input.sessionId ?? null,
      student_id: input.studentId ?? row.student_id,
      author_user_id: input.authorUserId,
      note_body: input.noteBody,
      note_kind: kind,
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
      metadata: { counselingRequestId: input.counselingRequestId, noteKind: kind },
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
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      noteKind: r.note_kind,
      noteBody: r.note_body,
      authoredAt: r.authored_at,
      authorUserId: r.author_user_id,
    }))
  }

  async createGuidanceReferral(input: {
    organizationId: string
    studentId?: string
    fromRequestId?: string | null
    toOffice: SssOffice
    specialistType?: string | null
    reasonSummary?: string | null
    createdBy: string
    markReferred?: boolean
  }) {
    if (
      input.specialistType &&
      !COUNSELING_SPECIALIST_CODES.includes(input.specialistType as (typeof COUNSELING_SPECIALIST_CODES)[number])
    ) {
      throw new EnrollmentWorkflowError(
        'Unknown specialist type; use scaffold catalog until university confirms',
        422,
        'INVALID_SPECIALIST_TYPE'
      )
    }
    let studentId = input.studentId
    let fromRequestId = input.fromRequestId ?? null
    const shouldMarkReferred = input.markReferred ?? Boolean(input.specialistType)
    if (fromRequestId) {
      const req = await db
        .from(t('counseling_requests'))
        .where({ id: fromRequestId, organization_id: input.organizationId })
        .first()
      if (!req) throw new EnrollmentWorkflowError('Counseling request not found', 404, 'NOT_FOUND')
      studentId = String(req.student_id)
      if (shouldMarkReferred) {
        const allowed = COUNSELING_REQUEST_TRANSITIONS[req.status] ?? []
        if (!allowed.includes('referred') && req.status !== 'referred') {
          throw new EnrollmentWorkflowError(
            `Cannot refer from status ${req.status}`,
            422,
            'INVALID_COUNSELING_TRANSITION'
          )
        }
        await db
          .from(t('counseling_requests'))
          .where({ id: fromRequestId, organization_id: input.organizationId })
          .update({ status: 'referred', updated_at: sqlNow() })
      }
    }
    if (!studentId) throw new EnrollmentWorkflowError('studentId required', 422, 'STUDENT_REQUIRED')
    const id = randomUUID()
    await db.table(t('guidance_referrals')).insert({
      id,
      organization_id: input.organizationId,
      student_id: studentId,
      from_request_id: fromRequestId,
      from_office: 'guidance',
      to_office: input.toOffice,
      specialist_type: input.specialistType ?? null,
      status: 'open',
      created_by: input.createdBy,
      reason_summary: input.reasonSummary ?? null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.createdBy,
      action: 'guidance.referral.create',
      entityType: 'guidance_referrals',
      entityId: id,
      metadata: {
        toOffice: input.toOffice,
        specialistType: input.specialistType ?? null,
        fromRequestId,
        markReferred: shouldMarkReferred,
      },
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId,
      templateCode: 'sss.referral.created',
      payload: { referralId: id, toOffice: input.toOffice },
    })
    if (fromRequestId && shouldMarkReferred) {
      return {
        referralId: id,
        request: await this.getCounselingRequest(input.organizationId, fromRequestId),
      }
    }
    return { referralId: id }
  }

  async resolveCounselingRequest(input: {
    organizationId: string
    counselingRequestId: string
    actorUserId: string
    resolutionSummary?: string | null
  }) {
    const row = await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Counseling request not found', 404, 'NOT_FOUND')
    const allowed = COUNSELING_REQUEST_TRANSITIONS[row.status] ?? []
    if (!allowed.includes('resolved')) {
      throw new EnrollmentWorkflowError(
        `Cannot resolve from status ${row.status}`,
        422,
        'INVALID_COUNSELING_TRANSITION'
      )
    }
    await db
      .from(t('counseling_requests'))
      .where({ id: input.counselingRequestId, organization_id: input.organizationId })
      .update({
        status: 'resolved',
        resolved_at: sqlNow(),
        updated_at: sqlNow(),
      })
    if (row.service_request_id) {
      await db
        .from(t('sss_service_requests'))
        .where({ id: row.service_request_id, organization_id: input.organizationId })
        .update({ status: 'closed', updated_at: sqlNow() })
    }
    if (input.resolutionSummary?.trim()) {
      await this.writeCaseNote({
        organizationId: input.organizationId,
        counselingRequestId: input.counselingRequestId,
        studentId: String(row.student_id),
        authorUserId: input.actorUserId,
        noteBody: input.resolutionSummary.trim(),
        noteKind: 'case_note',
      })
    }
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.counseling.resolve',
      entityType: 'counseling_requests',
      entityId: input.counselingRequestId,
      metadata: { status: 'resolved' },
    })
    return this.getCounselingRequest(input.organizationId, input.counselingRequestId)
  }

  counselingSpecialistCatalog() {
    return {
      specialists: COUNSELING_SPECIALIST_TYPES.map((s) => ({ ...s })),
      statuses: [...COUNSELING_REQUEST_STATUSES],
      note: 'ENR-055 specialist types are scaffold only; retention/access policy [CONFIRM].',
    }
  }

  async counselingCaseReport(organizationId: string) {
    const cases = await this.listCounselingRequests(organizationId)
    const byStatus: Record<string, number> = {}
    let openCount = 0
    let followUpCount = 0
    let referredCount = 0
    let sessionTotal = 0
    for (const c of cases) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1
      if (c.status !== 'resolved') openCount += 1
      if (c.status === 'follow_up') followUpCount += 1
      if (c.status === 'referred') referredCount += 1
      sessionTotal += c.sessionCount
    }
    return {
      openCount,
      followUpCount,
      referredCount,
      totalCases: cases.length,
      sessionTotal,
      byStatus: Object.entries(byStatus).map(([status, total]) => ({ status, total })),
      specialistCatalog: COUNSELING_SPECIALIST_TYPES,
      note: 'ENR-055 counseling case report; retention policy [CONFIRM].',
    }
  }

  psychTestBatteryCatalog() {
    return {
      batteries: PSYCH_TEST_BATTERY_CATALOG.map((b) => ({ ...b })),
      note: 'Scaffold battery codes only. Official WMSU instruments and scoring rules [CONFIRM] with Guidance before production.',
    }
  }

  async schedulePsychTest(input: {
    organizationId: string
    title: string
    collegeCode?: string | null
    scheduledAt: string
    venue?: string | null
    createdBy: string
  }) {
    const scheduled = DateTime.fromISO(input.scheduledAt)
    if (!scheduled.isValid) {
      throw new EnrollmentWorkflowError('Invalid scheduledAt', 422, 'INVALID_SCHEDULED_AT')
    }
    const id = randomUUID()
    await db.table(t('psych_test_schedules')).insert({
      id,
      organization_id: input.organizationId,
      title: input.title,
      college_code: input.collegeCode ?? null,
      scheduled_at: scheduled.toSQL(),
      venue: input.venue ?? null,
      status: 'scheduled',
      created_by: input.createdBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      templateCode: 'sss.psych.schedule.created',
      subject: input.title,
      payload: { scheduleId: id, collegeCode: input.collegeCode ?? null },
    })
    return id
  }

  async listPsychSchedules(organizationId: string, collegeCode?: string | null) {
    const q = db
      .from(t('psych_test_schedules'))
      .where({ organization_id: organizationId })
      .orderBy('scheduled_at', 'desc')
      .limit(50)
    if (collegeCode) q.andWhere('college_code', collegeCode)
    const rows = await q
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      collegeCode: r.college_code,
      scheduledAt: r.scheduled_at,
      venue: r.venue,
      status: r.status,
      createdAt: r.created_at,
    }))
  }

  async updatePsychScheduleStatus(input: {
    organizationId: string
    scheduleId: string
    status: (typeof PSYCH_SCHEDULE_STATUSES)[number]
  }) {
    if (!(PSYCH_SCHEDULE_STATUSES as readonly string[]).includes(input.status)) {
      throw new EnrollmentWorkflowError('Invalid psych schedule status', 422, 'INVALID_PSYCH_STATUS')
    }
    const row = await db
      .from(t('psych_test_schedules'))
      .where({ id: input.scheduleId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Psych schedule not found', 404, 'NOT_FOUND')
    await db
      .from(t('psych_test_schedules'))
      .where({ id: input.scheduleId, organization_id: input.organizationId })
      .update({ status: input.status, updated_at: sqlNow() })
  }

  async encodePsychResult(input: {
    organizationId: string
    scheduleId?: string | null
    studentId: string
    testCode: string
    encodedBy: string
  }) {
    if (!(PSYCH_TEST_CODES as readonly string[]).includes(input.testCode)) {
      throw new EnrollmentWorkflowError(
        `Unknown psych test code. Allowed: ${PSYCH_TEST_CODES.join(', ')}`,
        422,
        'INVALID_PSYCH_TEST_CODE'
      )
    }
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    if (input.scheduleId) {
      const schedule = await db
        .from(t('psych_test_schedules'))
        .where({ id: input.scheduleId, organization_id: input.organizationId })
        .first()
      if (!schedule) throw new EnrollmentWorkflowError('Psych schedule not found', 404, 'NOT_FOUND')
    }
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
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.encodedBy,
      action: 'guidance.psych.encode',
      entityType: 'psych_test_results',
      entityId: id,
      metadata: { testCode: input.testCode, studentId: input.studentId },
    })
    return id
  }

  async listPsychResults(organizationId: string, filters?: { studentId?: string; scheduleId?: string }) {
    const q = db
      .from(`${t('psych_test_results')} as r`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'r.student_id')
      .where('r.organization_id', organizationId)
      .select(
        'r.id',
        'r.schedule_id',
        'r.student_id',
        'r.test_code',
        'r.controlled_release',
        'r.released',
        'r.released_at',
        'r.encoded_at',
        'st.student_number',
        'st.first_name',
        'st.last_name'
      )
      .orderBy('r.encoded_at', 'desc')
      .limit(50)
    if (filters?.studentId) q.andWhere('r.student_id', filters.studentId)
    if (filters?.scheduleId) q.andWhere('r.schedule_id', filters.scheduleId)
    const rows = await q
    return rows.map((r) => ({
      id: r.id,
      scheduleId: r.schedule_id,
      studentId: r.student_id,
      studentNumber: r.student_number,
      studentName: r.last_name && r.first_name ? `${r.last_name}, ${r.first_name}` : null,
      testCode: r.test_code,
      controlledRelease: Boolean(r.controlled_release),
      released: Boolean(r.released),
      releasedAt: r.released_at,
      encodedAt: r.encoded_at,
    }))
  }

  async psychTestReport(organizationId: string, resultId: string, actorUserId: string) {
    const row = await db
      .from(`${t('psych_test_results')} as r`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'r.student_id')
      .leftJoin(`${t('psych_test_schedules')} as s`, 's.id', 'r.schedule_id')
      .where('r.id', resultId)
      .where('r.organization_id', organizationId)
      .select(
        'r.*',
        'st.student_number',
        'st.first_name',
        'st.last_name',
        's.title as schedule_title',
        's.college_code',
        's.scheduled_at',
        's.venue'
      )
      .first()
    if (!row) throw new EnrollmentWorkflowError('Psych result not found', 404, 'NOT_FOUND')
    await sssPrivacy.logSensitiveAccess({
      organizationId,
      actorUserId,
      office: 'guidance',
      entityType: 'psych_test_results',
      entityId: resultId,
      studentId: row.student_id,
      purpose: 'enr054_psych_report_review',
    })
    const battery = PSYCH_TEST_BATTERY_CATALOG.find((b) => b.code === row.test_code)
    return {
      resultId: row.id,
      testCode: row.test_code,
      batteryLabel: battery?.label ?? row.test_code,
      student: {
        id: row.student_id,
        studentNumber: row.student_number,
        name: row.last_name && row.first_name ? `${row.last_name}, ${row.first_name}` : null,
      },
      schedule: row.schedule_id
        ? {
            id: row.schedule_id,
            title: row.schedule_title,
            collegeCode: row.college_code,
            scheduledAt: row.scheduled_at,
            venue: row.venue,
          }
        : null,
      controlledRelease: Boolean(row.controlled_release),
      released: Boolean(row.released),
      releasedAt: row.released_at,
      encodedAt: row.encoded_at,
      consultationRequiredBeforeRelease: true,
      note: 'Operational psych report metadata only. Raw instrument scores are not stored in this scaffold; official report content [CONFIRM] with Guidance.',
    }
  }

  async releasePsychResult(input: {
    organizationId: string
    resultId: string
    actorUserId: string
    consultationCompleted: boolean
  }) {
    if (!input.consultationCompleted) {
      throw new EnrollmentWorkflowError(
        'Controlled release requires consultationCompleted=true',
        422,
        'CONSULTATION_REQUIRED'
      )
    }
    const row = await db
      .from(t('psych_test_results'))
      .where({ id: input.resultId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Psych result not found', 404, 'NOT_FOUND')
    if (row.released) {
      throw new EnrollmentWorkflowError('Result already released', 409, 'ALREADY_RELEASED')
    }
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
      metadata: { consultationCompleted: true },
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: row.student_id,
      templateCode: 'sss.psych.result.released',
      subject: 'Psychological test result available after consultation',
      payload: { resultId: input.resultId, testCode: row.test_code },
    })
  }

  private parseShiftingRequirements(raw: unknown) {
    if (!raw) {
      return {
        documents: SHIFTING_REQUIREMENT_KEYS_DEFAULT.map((key) => ({
          key,
          label: key.replaceAll('_', ' '),
          submitted: false,
        })),
        endorsements: {
          originating_college: 'pending',
          receiving_college: 'pending',
          admission: 'pending',
        },
        counselingLinked: false,
        resultSummary: null as string | null,
      }
    }
    const parsed =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>)
    const docs = Array.isArray(parsed.documents)
      ? (parsed.documents as Array<{ key: string; label?: string; submitted?: boolean }>)
      : SHIFTING_REQUIREMENT_KEYS_DEFAULT.map((key) => ({
          key,
          label: key.replaceAll('_', ' '),
          submitted: false,
        }))
    const endorsements = {
      originating_college: 'pending',
      receiving_college: 'pending',
      admission: 'pending',
      ...((parsed.endorsements as Record<string, string> | undefined) ?? {}),
    }
    return {
      documents: docs.map((d) => ({
        key: d.key,
        label: d.label ?? d.key.replaceAll('_', ' '),
        submitted: Boolean(d.submitted),
      })),
      endorsements,
      counselingLinked: Boolean(parsed.counselingLinked),
      resultSummary: (parsed.resultSummary as string | null | undefined) ?? null,
    }
  }

  private mapShiftingRow(row: Record<string, any>) {
    const requirements = this.parseShiftingRequirements(row.requirements_json)
    const requirementsComplete = requirements.documents.every((d) => d.submitted)
    return {
      id: row.id,
      studentId: row.student_id,
      studentNumber: row.student_number ?? null,
      studentName:
        row.last_name && row.first_name ? `${row.last_name}, ${row.first_name}` : null,
      fromProgramCode: row.from_program_code,
      toProgramCode: row.to_program_code,
      status: row.status,
      requirements,
      requirementsComplete,
      examScheduledAt: row.exam_scheduled_at,
      paymentTag: row.payment_tag,
      resultReleased: Boolean(row.result_released),
      endorsementStatus: row.endorsement_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      note: 'Official shifting eligibility rules and fee codes [CONFIRM] with Guidance/Admissions/Cashier.',
    }
  }

  async applyShiftingExam(input: {
    organizationId: string
    studentId: string
    fromProgramCode?: string | null
    toProgramCode?: string | null
    requirementsJson?: Record<string, unknown> | null
    actorUserId?: string | null
  }) {
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    const requirements = this.parseShiftingRequirements(input.requirementsJson)
    const id = randomUUID()
    await db.table(t('shifting_exam_applications')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      from_program_code: input.fromProgramCode ?? null,
      to_program_code: input.toProgramCode ?? null,
      status: 'submitted',
      requirements_json: JSON.stringify(requirements),
      exam_scheduled_at: null,
      payment_tag: null,
      result_released: false,
      endorsement_status: 'pending',
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: 'sss.shifting.submitted',
      subject: 'Shifting exam application submitted',
      payload: { applicationId: id },
    })
    if (input.actorUserId) {
      await sssPrivacy.logOperational({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: 'guidance.shifting.apply',
        entityType: 'shifting_exam_applications',
        entityId: id,
      })
    }
    return id
  }

  async listShiftingExamApplications(organizationId: string, filters?: { studentId?: string }) {
    const q = db
      .from(`${t('shifting_exam_applications')} as a`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'a.student_id')
      .where('a.organization_id', organizationId)
      .select(
        'a.*',
        'st.student_number',
        'st.first_name',
        'st.last_name'
      )
      .orderBy('a.created_at', 'desc')
      .limit(50)
    if (filters?.studentId) q.andWhere('a.student_id', filters.studentId)
    const rows = await q
    return rows.map((r) => this.mapShiftingRow(r))
  }

  async getShiftingExamApplication(organizationId: string, applicationId: string) {
    const row = await db
      .from(`${t('shifting_exam_applications')} as a`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'a.student_id')
      .where('a.id', applicationId)
      .where('a.organization_id', organizationId)
      .select('a.*', 'st.student_number', 'st.first_name', 'st.last_name')
      .first()
    if (!row) throw new EnrollmentWorkflowError('Shifting application not found', 404, 'NOT_FOUND')
    return this.mapShiftingRow(row)
  }

  private async loadShiftingRow(organizationId: string, applicationId: string) {
    const row = await db
      .from(t('shifting_exam_applications'))
      .where({ id: applicationId, organization_id: organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Shifting application not found', 404, 'NOT_FOUND')
    return row
  }

  private assertShiftingTransition(from: string, to: string) {
    const allowed = SHIFTING_EXAM_TRANSITIONS[from] ?? []
    if (!allowed.includes(to)) {
      throw new EnrollmentWorkflowError(
        `Cannot transition shifting exam ${from} → ${to}`,
        422,
        'INVALID_SHIFTING_TRANSITION'
      )
    }
  }

  async updateShiftingRequirements(input: {
    organizationId: string
    applicationId: string
    documents: Array<{ key: string; submitted: boolean; label?: string }>
    actorUserId: string
  }) {
    const row = await this.loadShiftingRow(input.organizationId, input.applicationId)
    if (['released', 'endorsed', 'rejected'].includes(row.status)) {
      throw new EnrollmentWorkflowError('Application is closed for requirement edits', 409, 'CLOSED')
    }
    const current = this.parseShiftingRequirements(row.requirements_json)
    const byKey = new Map(input.documents.map((d) => [d.key, d]))
    const documents = current.documents.map((d) => {
      const next = byKey.get(d.key)
      return next
        ? { key: d.key, label: next.label ?? d.label, submitted: Boolean(next.submitted) }
        : d
    })
    for (const extra of input.documents) {
      if (!documents.some((d) => d.key === extra.key)) {
        documents.push({
          key: extra.key,
          label: extra.label ?? extra.key.replaceAll('_', ' '),
          submitted: Boolean(extra.submitted),
        })
      }
    }
    const complete = documents.every((d) => d.submitted)
    let nextStatus = row.status as string
    if (['submitted', 'requirements_incomplete', 'requirements_validated'].includes(row.status)) {
      nextStatus = complete ? 'requirements_validated' : 'requirements_incomplete'
      if (row.status !== nextStatus) this.assertShiftingTransition(row.status, nextStatus)
    }
    await db
      .from(t('shifting_exam_applications'))
      .where({ id: input.applicationId })
      .update({
        requirements_json: JSON.stringify({ ...current, documents }),
        status: nextStatus,
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.shifting.requirements',
      entityType: 'shifting_exam_applications',
      entityId: input.applicationId,
      metadata: { complete },
    })
    return this.getShiftingExamApplication(input.organizationId, input.applicationId)
  }

  async scheduleShiftingExam(input: {
    organizationId: string
    applicationId: string
    examScheduledAt: string
    actorUserId: string
  }) {
    const row = await this.loadShiftingRow(input.organizationId, input.applicationId)
    this.assertShiftingTransition(row.status, 'scheduled')
    const when = DateTime.fromISO(input.examScheduledAt)
    if (!when.isValid) {
      throw new EnrollmentWorkflowError('Invalid examScheduledAt', 422, 'INVALID_SCHEDULED_AT')
    }
    await db
      .from(t('shifting_exam_applications'))
      .where({ id: input.applicationId })
      .update({
        exam_scheduled_at: when.toSQL(),
        status: 'scheduled',
        updated_at: sqlNow(),
      })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: row.student_id,
      templateCode: 'sss.shifting.scheduled',
      subject: 'Shifting exam scheduled',
      payload: { applicationId: input.applicationId, examScheduledAt: input.examScheduledAt },
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.shifting.schedule',
      entityType: 'shifting_exam_applications',
      entityId: input.applicationId,
    })
    return this.getShiftingExamApplication(input.organizationId, input.applicationId)
  }

  async tagShiftingPayment(input: {
    organizationId: string
    applicationId: string
    paymentTag: string
    actorUserId: string
  }) {
    const row = await this.loadShiftingRow(input.organizationId, input.applicationId)
    this.assertShiftingTransition(row.status, 'payment_tagged')
    const tag = input.paymentTag.trim()
    if (!tag) throw new EnrollmentWorkflowError('paymentTag is required', 422, 'PAYMENT_TAG_REQUIRED')
    await db
      .from(t('shifting_exam_applications'))
      .where({ id: input.applicationId })
      .update({
        payment_tag: tag,
        status: 'payment_tagged',
        updated_at: sqlNow(),
      })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: row.student_id,
      templateCode: 'sss.shifting.payment_tagged',
      subject: 'Shifting exam payment tagged',
      payload: { applicationId: input.applicationId, paymentTag: tag },
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.shifting.payment_tag',
      entityType: 'shifting_exam_applications',
      entityId: input.applicationId,
      metadata: { paymentTag: tag },
    })
    return this.getShiftingExamApplication(input.organizationId, input.applicationId)
  }

  async markShiftingResultReady(input: {
    organizationId: string
    applicationId: string
    resultSummary?: string | null
    actorUserId: string
  }) {
    const row = await this.loadShiftingRow(input.organizationId, input.applicationId)
    this.assertShiftingTransition(row.status, 'result_ready')
    const current = this.parseShiftingRequirements(row.requirements_json)
    await db
      .from(t('shifting_exam_applications'))
      .where({ id: input.applicationId })
      .update({
        requirements_json: JSON.stringify({
          ...current,
          resultSummary: input.resultSummary ?? current.resultSummary,
        }),
        status: 'result_ready',
        updated_at: sqlNow(),
      })
    return this.getShiftingExamApplication(input.organizationId, input.applicationId)
  }

  async releaseShiftingResult(input: {
    organizationId: string
    applicationId: string
    consultationCompleted: boolean
    actorUserId: string
  }) {
    if (!input.consultationCompleted) {
      throw new EnrollmentWorkflowError(
        'Result release requires consultationCompleted=true (counseling integration)',
        422,
        'CONSULTATION_REQUIRED'
      )
    }
    const row = await this.loadShiftingRow(input.organizationId, input.applicationId)
    this.assertShiftingTransition(row.status, 'released')
    const current = this.parseShiftingRequirements(row.requirements_json)
    await db
      .from(t('shifting_exam_applications'))
      .where({ id: input.applicationId })
      .update({
        result_released: true,
        status: 'released',
        requirements_json: JSON.stringify({ ...current, counselingLinked: true }),
        updated_at: sqlNow(),
      })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: row.student_id,
      templateCode: 'sss.shifting.result.released',
      subject: 'Shifting exam result released after consultation',
      payload: { applicationId: input.applicationId },
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.shifting.release',
      entityType: 'shifting_exam_applications',
      entityId: input.applicationId,
      metadata: { consultationCompleted: true },
    })
    return this.getShiftingExamApplication(input.organizationId, input.applicationId)
  }

  async endorseShiftingExam(input: {
    organizationId: string
    applicationId: string
    party: (typeof SHIFTING_ENDORSEMENT_PARTIES)[number]
    decision: 'endorsed' | 'rejected'
    actorUserId: string
  }) {
    if (!(SHIFTING_ENDORSEMENT_PARTIES as readonly string[]).includes(input.party)) {
      throw new EnrollmentWorkflowError('Invalid endorsement party', 422, 'INVALID_ENDORSEMENT_PARTY')
    }
    const row = await this.loadShiftingRow(input.organizationId, input.applicationId)
    if (row.status !== 'released' && row.status !== 'endorsed') {
      throw new EnrollmentWorkflowError(
        'Endorsements start after result release',
        422,
        'NOT_READY_FOR_ENDORSEMENT'
      )
    }
    if (input.decision === 'rejected') {
      await db
        .from(t('shifting_exam_applications'))
        .where({ id: input.applicationId })
        .update({
          status: 'rejected',
          endorsement_status: `${input.party}:rejected`,
          updated_at: sqlNow(),
        })
      return this.getShiftingExamApplication(input.organizationId, input.applicationId)
    }
    const current = this.parseShiftingRequirements(row.requirements_json)
    const endorsements = { ...current.endorsements, [input.party]: 'endorsed' }
    const allDone = SHIFTING_ENDORSEMENT_PARTIES.every((p) => endorsements[p] === 'endorsed')
    if (allDone && row.status === 'released') this.assertShiftingTransition('released', 'endorsed')
    await db
      .from(t('shifting_exam_applications'))
      .where({ id: input.applicationId })
      .update({
        requirements_json: JSON.stringify({ ...current, endorsements }),
        endorsement_status: allDone ? 'complete' : 'in_progress',
        status: allDone ? 'endorsed' : 'released',
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'guidance.shifting.endorse',
      entityType: 'shifting_exam_applications',
      entityId: input.applicationId,
      metadata: { party: input.party, decision: input.decision, complete: allDone },
    })
    return this.getShiftingExamApplication(input.organizationId, input.applicationId)
  }

  async rejectShiftingExam(input: {
    organizationId: string
    applicationId: string
    actorUserId: string
    reason?: string | null
  }) {
    const row = await this.loadShiftingRow(input.organizationId, input.applicationId)
    this.assertShiftingTransition(row.status, 'rejected')
    await db
      .from(t('shifting_exam_applications'))
      .where({ id: input.applicationId })
      .update({
        status: 'rejected',
        endorsement_status: input.reason ? `rejected:${input.reason.slice(0, 80)}` : 'rejected',
        updated_at: sqlNow(),
      })
    return this.getShiftingExamApplication(input.organizationId, input.applicationId)
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
    diagnosisLabel?: string | null
    medicationLabel?: string | null
    medicationInstructions?: string | null
    hospitalReferralFacility?: string | null
  }) {
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    const healthRecordId = await this.ensureHealthRecord({
      organizationId: input.organizationId,
      studentId: input.studentId,
      openedBy: input.clinicianUserId,
    })
    const encounterId = randomUUID()
    const encounterType = input.isEmergency ? 'emergency' : (input.encounterType ?? 'outpatient')
    await db.table(t('health_encounters')).insert({
      id: encounterId,
      organization_id: input.organizationId,
      health_record_id: healthRecordId,
      student_id: input.studentId,
      encounter_type: encounterType,
      is_emergency: Boolean(input.isEmergency),
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
        note_kind: input.diagnosisLabel ? 'diagnosis' : 'consultation',
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
        metadata: { encounterId, noteKind: input.diagnosisLabel ? 'diagnosis' : 'consultation' },
      })
    }
    let prescriptionId: string | null = null
    if (input.medicationLabel?.trim()) {
      prescriptionId = await this.addHealthPrescription({
        organizationId: input.organizationId,
        encounterId,
        studentId: input.studentId,
        medicationLabel: input.medicationLabel.trim(),
        instructions: input.medicationInstructions ?? null,
        prescribedBy: input.clinicianUserId,
      })
    }
    let hospitalReferralId: string | null = null
    if (input.hospitalReferralFacility?.trim()) {
      hospitalReferralId = await this.createHospitalReferral({
        organizationId: input.organizationId,
        studentId: input.studentId,
        encounterId,
        toFacility: input.hospitalReferralFacility.trim(),
        createdBy: input.clinicianUserId,
      })
    }
    if (input.isEmergency) {
      await sssPrivacy.enqueueNotification({
        organizationId: input.organizationId,
        studentId: input.studentId,
        templateCode: 'sss.health.emergency.logged',
        subject: 'Emergency health encounter recorded',
        payload: { encounterId },
      })
    }
    return { healthRecordId, encounterId, prescriptionId, hospitalReferralId }
  }

  async addChronicCondition(input: {
    organizationId: string
    studentId: string
    conditionCode: string
    label: string
    isChronic?: boolean
    recordedBy: string
  }) {
    const healthRecordId = await this.ensureHealthRecord({
      organizationId: input.organizationId,
      studentId: input.studentId,
      openedBy: input.recordedBy,
    })
    const id = randomUUID()
    await db.table(t('health_conditions')).insert({
      id,
      organization_id: input.organizationId,
      health_record_id: healthRecordId,
      student_id: input.studentId,
      condition_code: input.conditionCode.trim().toUpperCase(),
      label: input.label.trim(),
      is_chronic: input.isChronic ?? true,
      status: 'active',
      recorded_at: sqlNow(),
      recorded_by: input.recordedBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.recordedBy,
      action: 'health.condition.add',
      entityType: 'health_conditions',
      entityId: id,
      metadata: { conditionCode: input.conditionCode, isChronic: input.isChronic ?? true },
    })
    return id
  }

  async addMedicalAlert(input: {
    organizationId: string
    studentId: string
    alertCode: string
    severity?: string
    recordedBy: string
  }) {
    const healthRecordId = await this.ensureHealthRecord({
      organizationId: input.organizationId,
      studentId: input.studentId,
      openedBy: input.recordedBy,
    })
    const id = randomUUID()
    await db.table(t('medical_alerts')).insert({
      id,
      organization_id: input.organizationId,
      health_record_id: healthRecordId,
      student_id: input.studentId,
      alert_code: input.alertCode.trim().toUpperCase(),
      severity: input.severity ?? 'info',
      status: 'active',
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.recordedBy,
      action: 'health.alert.add',
      entityType: 'medical_alerts',
      entityId: id,
      metadata: { alertCode: input.alertCode, severity: input.severity ?? 'info' },
    })
    return id
  }

  async addHealthPrescription(input: {
    organizationId: string
    encounterId: string
    studentId: string
    medicationLabel: string
    instructions?: string | null
    prescribedBy: string
  }) {
    const encounter = await db
      .from(t('health_encounters'))
      .where({ id: input.encounterId, organization_id: input.organizationId, student_id: input.studentId })
      .first()
    if (!encounter) throw new EnrollmentWorkflowError('Encounter not found', 404, 'NOT_FOUND')
    const id = randomUUID()
    await db.table(t('health_prescriptions')).insert({
      id,
      organization_id: input.organizationId,
      encounter_id: input.encounterId,
      student_id: input.studentId,
      medication_label: input.medicationLabel.trim(),
      instructions: input.instructions ?? null,
      prescribed_by: input.prescribedBy,
      prescribed_at: sqlNow(),
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.prescribedBy,
      action: 'health.prescription.add',
      entityType: 'health_prescriptions',
      entityId: id,
      metadata: { encounterId: input.encounterId },
    })
    return id
  }

  async createHospitalReferral(input: {
    organizationId: string
    studentId: string
    encounterId?: string | null
    toFacility: string
    createdBy: string
  }) {
    const id = randomUUID()
    await db.table(t('health_referrals')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      encounter_id: input.encounterId ?? null,
      to_facility: input.toFacility.trim(),
      to_office: null,
      is_hospital: true,
      status: 'open',
      created_by: input.createdBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: 'sss.health.hospital_referral',
      subject: `Hospital referral to ${input.toFacility}`,
      payload: { referralId: id, toFacility: input.toFacility },
    })
    return id
  }

  async getStudentEhrProfile(organizationId: string, studentId: string, actorUserId: string) {
    const student = await Student.find(studentId)
    if (!student || student.organizationId !== organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    const recordId = await this.ensureHealthRecord({
      organizationId,
      studentId,
      openedBy: actorUserId,
    })
    await sssPrivacy.logSensitiveAccess({
      organizationId,
      actorUserId,
      office: 'health',
      entityType: 'health_records',
      entityId: recordId,
      studentId,
      purpose: 'enr057_ehr_profile_review',
    })

    const conditions = await db
      .from(t('health_conditions'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('recorded_at', 'desc')
      .limit(50)
    const alerts = await db
      .from(t('medical_alerts'))
      .where({ organization_id: organizationId, student_id: studentId, status: 'active' })
      .orderBy('created_at', 'desc')
      .limit(50)
    const encounters = await db
      .from(t('health_encounters'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('encountered_at', 'desc')
      .limit(40)
    const prescriptions = await db
      .from(t('health_prescriptions'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('prescribed_at', 'desc')
      .limit(40)
    const referrals = await db
      .from(t('health_referrals'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('created_at', 'desc')
      .limit(40)
    const clearance = await this.getLatestHealthClearance(organizationId, studentId)

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: `${student.lastName}, ${student.firstName}`,
      },
      healthRecordId: recordId,
      clearance: clearance
        ? { status: clearance.status, clearanceType: clearance.clearance_type, decidedAt: clearance.decided_at }
        : null,
      chronicConditions: conditions.map((c) => ({
        id: c.id,
        conditionCode: c.condition_code,
        label: c.label,
        isChronic: Boolean(c.is_chronic),
        status: c.status,
        recordedAt: c.recorded_at,
      })),
      medicalAlerts: alerts.map((a) => ({
        id: a.id,
        alertCode: a.alert_code,
        severity: a.severity,
        status: a.status,
        createdAt: a.created_at,
      })),
      encounters: encounters.map((e) => ({
        id: e.id,
        encounterType: e.encounter_type,
        isEmergency: Boolean(e.is_emergency),
        status: e.status,
        encounteredAt: e.encountered_at,
      })),
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        encounterId: p.encounter_id,
        medicationLabel: p.medication_label,
        instructions: p.instructions,
        prescribedAt: p.prescribed_at,
      })),
      referrals: referrals.map((r) => ({
        id: r.id,
        toFacility: r.to_facility,
        toOffice: r.to_office,
        isHospital: Boolean(r.is_hospital),
        status: r.status,
        createdAt: r.created_at,
      })),
      emergencyCount: encounters.filter((e) => e.is_emergency).length,
      note: 'EHR operational profile. Clinical note bodies remain on restricted clinical-note endpoints; retention rules [CONFIRM] with DPO/Health.',
    }
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

  healthProgramCatalog() {
    return {
      programs: HEALTH_PROGRAM_CATALOG.map((p) => ({ ...p })),
      assessmentContexts: MEDICAL_ASSESSMENT_CONTEXTS.map((c) => c),
      enrollmentGateMode: 'advisory' as const,
      note: 'Scaffold mandatory program flags only. Official freshman/transferee rules and hard enrollment block [CONFIRM] with Health/Registrar.',
    }
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
    if (
      input.assessmentContext &&
      !(MEDICAL_ASSESSMENT_CONTEXTS as readonly string[]).includes(input.assessmentContext)
    ) {
      throw new EnrollmentWorkflowError(
        `Invalid assessmentContext. Allowed: ${MEDICAL_ASSESSMENT_CONTEXTS.join(', ')}`,
        422,
        'INVALID_ASSESSMENT_CONTEXT'
      )
    }
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
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
      payload: { clearanceId: id, status: input.status, assessmentContext: input.assessmentContext ?? null },
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.decidedBy,
      action: 'health.clearance.set',
      entityType: 'health_clearances',
      entityId: id,
      metadata: { status: input.status, assessmentContext: input.assessmentContext ?? null },
    })
    return id
  }

  async recordMedicalAssessment(input: {
    organizationId: string
    studentId: string
    assessmentContext: (typeof MEDICAL_ASSESSMENT_CONTEXTS)[number]
    status: 'pending' | 'cleared' | 'denied'
    decidedBy: string
    validUntil?: string | null
    requireProgramsComplete?: boolean
  }) {
    if (input.requireProgramsComplete && input.status === 'cleared') {
      const gate = await this.enrollmentHealthGateCheck(input.organizationId, input.studentId)
      if (!gate.programsComplete) {
        throw new EnrollmentWorkflowError(
          `Cannot clear medical assessment until mandatory programs complete: ${gate.missingPrograms.join(', ')}`,
          422,
          'PROGRAMS_INCOMPLETE'
        )
      }
    }
    return this.setHealthClearance({
      organizationId: input.organizationId,
      studentId: input.studentId,
      status: input.status,
      clearanceType: 'enrollment',
      assessmentContext: input.assessmentContext,
      decidedBy: input.decidedBy,
      validUntil: input.validUntil ?? null,
    })
  }

  async recordHealthProgram(input: {
    organizationId: string
    studentId: string
    programCode: string
    status?: string
    recordedBy: string
  }) {
    if (!(HEALTH_PROGRAM_CODES as readonly string[]).includes(input.programCode)) {
      throw new EnrollmentWorkflowError(
        `Unknown health program code. Allowed: ${HEALTH_PROGRAM_CODES.join(', ')}`,
        422,
        'INVALID_HEALTH_PROGRAM'
      )
    }
    const status = input.status ?? 'completed'
    if (!(HEALTH_PROGRAM_STATUSES as readonly string[]).includes(status)) {
      throw new EnrollmentWorkflowError('Invalid health program status', 422, 'INVALID_PROGRAM_STATUS')
    }
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    const id = randomUUID()
    await db.table(t('health_program_participations')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      program_code: input.programCode,
      status,
      participated_at: status === 'completed' || status === 'excused' ? sqlNow() : null,
      recorded_by: input.recordedBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.recordedBy,
      action: 'health.program.record',
      entityType: 'health_program_participations',
      entityId: id,
      metadata: { programCode: input.programCode, status },
    })
    return id
  }

  async listHealthProgramParticipations(organizationId: string, studentId?: string) {
    const q = db
      .from(`${t('health_program_participations')} as p`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'p.student_id')
      .where('p.organization_id', organizationId)
      .select(
        'p.id',
        'p.student_id',
        'p.program_code',
        'p.status',
        'p.participated_at',
        'p.created_at',
        'st.student_number',
        'st.first_name',
        'st.last_name'
      )
      .orderBy('p.created_at', 'desc')
      .limit(100)
    if (studentId) q.andWhere('p.student_id', studentId)
    const rows = await q
    return rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentNumber: r.student_number,
      studentName: r.last_name && r.first_name ? `${r.last_name}, ${r.first_name}` : null,
      programCode: r.program_code,
      label: HEALTH_PROGRAM_CATALOG.find((p) => p.code === r.program_code)?.label ?? r.program_code,
      status: r.status,
      participatedAt: r.participated_at,
      createdAt: r.created_at,
    }))
  }

  async enrollmentHealthGateCheck(organizationId: string, studentId: string) {
    const clearance = await this.getLatestHealthClearance(organizationId, studentId)
    const participations = await db
      .from(t('health_program_participations'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('created_at', 'desc')

    const latestByProgram = new Map<string, string>()
    for (const row of participations) {
      if (!latestByProgram.has(row.program_code)) latestByProgram.set(row.program_code, row.status)
    }

    const mandatory = HEALTH_PROGRAM_CATALOG.filter((p) => p.mandatoryDefault)
    const programStatuses = mandatory.map((p) => {
      const status = latestByProgram.get(p.code) ?? 'missing'
      return {
        programCode: p.code,
        label: p.label,
        status,
        complete: status === 'completed' || status === 'excused',
      }
    })
    const missingPrograms = programStatuses.filter((p) => !p.complete).map((p) => p.programCode)
    const programsComplete = missingPrograms.length === 0
    const clearanceCleared = clearance?.status === 'cleared'
    const advisoryCleared = clearanceCleared && programsComplete

    return {
      studentId,
      enrollmentGateMode: 'advisory' as const,
      clearance: clearance
        ? {
            status: clearance.status,
            assessmentContext: clearance.assessment_context,
            decidedAt: clearance.decided_at,
            validUntil: clearance.valid_until,
          }
        : null,
      programs: programStatuses,
      missingPrograms,
      programsComplete,
      clearanceCleared,
      advisoryCleared,
      wouldBlockEnrollmentIfHardGate: !advisoryCleared,
      note: 'ENR-058 enrollment hard-block remains [CONFIRM]. Current mode is advisory-only and does not mutate enrollment writes.',
    }
  }

  async healthProgramStatistics(organizationId: string) {
    const rows = await db
      .from(t('health_program_participations'))
      .where({ organization_id: organizationId })
      .select('program_code')
      .count('* as total')
      .groupBy('program_code')
    const byStatus = await db
      .from(t('health_program_participations'))
      .where({ organization_id: organizationId })
      .select('status')
      .count('* as total')
      .groupBy('status')
    const clearances = await db
      .from(t('health_clearances'))
      .where({ organization_id: organizationId, clearance_type: 'enrollment' })
      .select('status')
      .count('* as total')
      .groupBy('status')
    const assessments = await db
      .from(t('health_clearances'))
      .where({ organization_id: organizationId, clearance_type: 'enrollment' })
      .whereNotNull('assessment_context')
      .select('assessment_context')
      .count('* as total')
      .groupBy('assessment_context')

    return {
      programsByCode: rows.map((r) => ({
        programCode: r.program_code,
        label: HEALTH_PROGRAM_CATALOG.find((p) => p.code === r.program_code)?.label ?? r.program_code,
        total: Number((r as { total?: string | number }).total ?? 0),
      })),
      programsByStatus: byStatus.map((r) => ({
        status: r.status,
        total: Number((r as { total?: string | number }).total ?? 0),
      })),
      clearancesByStatus: clearances.map((r) => ({
        status: r.status,
        total: Number((r as { total?: string | number }).total ?? 0),
      })),
      assessmentsByContext: assessments.map((r) => ({
        assessmentContext: r.assessment_context,
        total: Number((r as { total?: string | number }).total ?? 0),
      })),
      catalog: this.healthProgramCatalog(),
    }
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

  private serializeDisciplineCase(
    row: Record<string, unknown>,
    extras?: {
      complaint?: Record<string, unknown> | null
      sanctions?: Array<Record<string, unknown>>
    }
  ) {
    const status = String(row.workflow_status)
    return {
      id: row.id,
      complaintId: row.complaint_id,
      studentId: row.student_id,
      workflowStatus: status,
      sdtEngaged: Boolean(row.sdt_engaged),
      assignedTo: row.assigned_to,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      allowedNextStatuses: DISCIPLINE_WORKFLOW_TRANSITIONS[status] ?? [],
      complaint: extras?.complaint
        ? {
            id: extras.complaint.id,
            summary: extras.complaint.summary,
            status: extras.complaint.status,
            complainantRole: extras.complaint.complainant_role,
            complainantUserId: extras.complaint.complainant_user_id,
            filedAt: extras.complaint.filed_at,
          }
        : undefined,
      sanctions: (extras?.sanctions ?? []).map((s) => ({
        id: s.id,
        sanctionCode: s.sanction_code,
        label: s.label,
        effectiveFrom: s.effective_from,
        effectiveTo: s.effective_to,
        recordedBy: s.recorded_by,
      })),
      note: 'ENR-060 SDT sanction catalog and appeal windows remain [CONFIRM]; scaffold codes only.',
    }
  }

  async listDisciplineCases(
    organizationId: string,
    filters?: { studentId?: string; workflowStatus?: string; openOnly?: boolean }
  ) {
    const q = db.from(t('discipline_cases')).where({ organization_id: organizationId }).orderBy('opened_at', 'desc')
    if (filters?.studentId) q.where('student_id', filters.studentId)
    if (filters?.workflowStatus) q.where('workflow_status', filters.workflowStatus)
    if (filters?.openOnly) q.whereNotIn('workflow_status', ['closed'])
    const rows = await q.limit(100)
    if (!rows.length) return []
    const caseIds = rows.map((r) => r.id)
    const sanctions = await db
      .from(t('discipline_sanctions'))
      .where({ organization_id: organizationId })
      .whereIn('case_id', caseIds)
      .orderBy('created_at', 'asc')
    const byCase = new Map<string, Array<Record<string, unknown>>>()
    for (const s of sanctions) {
      const key = String(s.case_id)
      const list = byCase.get(key) ?? []
      list.push(s)
      byCase.set(key, list)
    }
    return rows.map((r) => this.serializeDisciplineCase(r, { sanctions: byCase.get(String(r.id)) ?? [] }))
  }

  async getDisciplineCase(organizationId: string, caseId: string) {
    const row = await db
      .from(t('discipline_cases'))
      .where({ id: caseId, organization_id: organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Discipline case not found', 404, 'NOT_FOUND')
    const complaint = await db
      .from(t('discipline_complaints'))
      .where({ id: row.complaint_id, organization_id: organizationId })
      .first()
    const sanctions = await db
      .from(t('discipline_sanctions'))
      .where({ case_id: caseId, organization_id: organizationId })
      .orderBy('created_at', 'asc')
    return this.serializeDisciplineCase(row, { complaint, sanctions })
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
    const row = await db
      .from(t('discipline_cases'))
      .where({ id: input.caseId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Discipline case not found', 404, 'NOT_FOUND')
    const allowed = DISCIPLINE_WORKFLOW_TRANSITIONS[row.workflow_status] ?? []
    if (!allowed.includes(input.workflowStatus)) {
      throw new EnrollmentWorkflowError(
        `Cannot transition discipline ${row.workflow_status} → ${input.workflowStatus}`,
        422,
        'INVALID_DISCIPLINE_TRANSITION'
      )
    }
    const sdtEngaged =
      input.workflowStatus === 'sdt' ? true : input.sdtEngaged ?? Boolean(row.sdt_engaged)
    await db
      .from(t('discipline_cases'))
      .where({ id: input.caseId, organization_id: input.organizationId })
      .update({
        workflow_status: input.workflowStatus,
        sdt_engaged: sdtEngaged,
        closed_at: input.workflowStatus === 'closed' ? sqlNow() : null,
        updated_at: sqlNow(),
      })
    await db
      .from(t('discipline_complaints'))
      .where({ id: row.complaint_id, organization_id: input.organizationId })
      .update({
        status: input.workflowStatus === 'closed' ? 'closed' : 'in_progress',
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'osa.discipline.advance',
      entityType: 'discipline_cases',
      entityId: input.caseId,
      metadata: {
        from: row.workflow_status,
        workflowStatus: input.workflowStatus,
        sdtEngaged,
      },
    })
    return this.getDisciplineCase(input.organizationId, input.caseId)
  }

  async recordSanction(input: {
    organizationId: string
    caseId: string
    studentId?: string
    sanctionCode: string
    label?: string
    recordedBy: string
  }) {
    if (!DISCIPLINE_SANCTION_CODES.includes(input.sanctionCode as (typeof DISCIPLINE_SANCTION_CODES)[number])) {
      throw new EnrollmentWorkflowError(
        'Unknown sanction code; use scaffold catalog until university confirms official list',
        422,
        'INVALID_SANCTION_CODE'
      )
    }
    const caseRow = await db
      .from(t('discipline_cases'))
      .where({ id: input.caseId, organization_id: input.organizationId })
      .first()
    if (!caseRow) throw new EnrollmentWorkflowError('Discipline case not found', 404, 'NOT_FOUND')
    if (!['sdt', 'decision', 'closed'].includes(String(caseRow.workflow_status))) {
      throw new EnrollmentWorkflowError(
        'Sanctions may be recorded at SDT, decision, or closed stages',
        422,
        'SANCTION_STAGE_INVALID'
      )
    }
    const catalog = DISCIPLINE_SANCTION_CATALOG.find((s) => s.code === input.sanctionCode)
    const id = randomUUID()
    await db.table(t('discipline_sanctions')).insert({
      id,
      organization_id: input.organizationId,
      case_id: input.caseId,
      student_id: input.studentId ?? caseRow.student_id,
      sanction_code: input.sanctionCode,
      label: input.label?.trim() || catalog?.label || input.sanctionCode,
      effective_from: sqlNow(),
      effective_to: null,
      recorded_by: input.recordedBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.recordedBy,
      action: 'osa.discipline.sanction',
      entityType: 'discipline_sanctions',
      entityId: id,
      metadata: { caseId: input.caseId, sanctionCode: input.sanctionCode },
    })
    return this.getDisciplineCase(input.organizationId, input.caseId)
  }

  async listDisciplinaryHistory(organizationId: string, studentId: string) {
    const sanctions = await db
      .from(t('discipline_sanctions'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('created_at', 'desc')
      .limit(100)
    const cases = await this.listDisciplineCases(organizationId, { studentId })
    return {
      studentId,
      cases,
      sanctions: sanctions.map((s) => ({
        id: s.id,
        caseId: s.case_id,
        sanctionCode: s.sanction_code,
        label: s.label,
        effectiveFrom: s.effective_from,
        effectiveTo: s.effective_to,
      })),
      sanctionCatalog: DISCIPLINE_SANCTION_CATALOG,
      note: 'Appeal windows [CONFIRM]; catalog codes are scaffold only.',
    }
  }

  async disciplineCaseReport(organizationId: string) {
    const cases = await this.listDisciplineCases(organizationId)
    const byStatus: Record<string, number> = {}
    let sdtEngaged = 0
    let openCount = 0
    for (const c of cases) {
      byStatus[c.workflowStatus] = (byStatus[c.workflowStatus] ?? 0) + 1
      if (c.sdtEngaged) sdtEngaged += 1
      if (c.workflowStatus !== 'closed') openCount += 1
    }
    const sanctionRows = await db
      .from(t('discipline_sanctions'))
      .where({ organization_id: organizationId })
      .select('sanction_code')
      .limit(500)
    const bySanction: Record<string, number> = {}
    for (const s of sanctionRows) {
      const code = String(s.sanction_code)
      bySanction[code] = (bySanction[code] ?? 0) + 1
    }
    return {
      openCount,
      sdtEngagedCount: sdtEngaged,
      totalCases: cases.length,
      byStatus: Object.entries(byStatus).map(([workflowStatus, total]) => ({ workflowStatus, total })),
      bySanction: Object.entries(bySanction).map(([sanctionCode, total]) => ({ sanctionCode, total })),
      sanctionCatalog: DISCIPLINE_SANCTION_CATALOG,
      note: 'ENR-060 case report; official sanction catalog / appeal windows [CONFIRM].',
    }
  }

  private normalizeOrgRequirements(raw: Record<string, unknown> | null | undefined) {
    const docsRaw = raw?.documents
    const documents: Array<{ key: string; label: string; submitted: boolean }> = []
    if (Array.isArray(docsRaw)) {
      for (const item of docsRaw) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const key = String(row.key ?? '').trim()
        if (!key) continue
        documents.push({
          key,
          label: String(row.label ?? key).trim() || key,
          submitted: Boolean(row.submitted),
        })
      }
    }
    for (const key of ORG_REQUIREMENT_KEYS_DEFAULT) {
      if (!documents.some((d) => d.key === key)) {
        documents.push({
          key,
          label: key.replace(/_/g, ' '),
          submitted: false,
        })
      }
    }
    const missing = documents.filter((d) => !d.submitted).map((d) => d.key)
    return {
      documents,
      missingRequired: missing,
      requirementsComplete: missing.length === 0,
      note:
        'Default requirement keys are scaffold until university confirms the official checklist (ENR-061).',
    }
  }

  async listOrgApplications(organizationId: string, limit = 50) {
    const rows = await db
      .from(t('org_applications'))
      .where('organization_id', organizationId)
      .orderBy('submitted_at', 'desc')
      .limit(limit)
    return rows.map((row) => this.serializeOrgApplication(row))
  }

  async listStudentOrganizations(organizationId: string, limit = 50) {
    return db
      .from(t('student_organizations'))
      .where('organization_id', organizationId)
      .orderBy('accredited_at', 'desc')
      .limit(limit)
  }

  async getOrgApplication(organizationId: string, applicationId: string) {
    const row = await db
      .from(t('org_applications'))
      .where({ id: applicationId, organization_id: organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Organization application not found', 404, 'NOT_FOUND')
    return this.serializeOrgApplication(row)
  }

  private serializeOrgApplication(row: Record<string, unknown>) {
    const requirements =
      typeof row.requirements_json === 'string'
        ? (JSON.parse(row.requirements_json) as Record<string, unknown>)
        : ((row.requirements_json as Record<string, unknown> | null) ?? {})
    const normalized = this.normalizeOrgRequirements(requirements)
    return {
      id: row.id,
      proposedName: row.proposed_name,
      applicationType: row.application_type,
      workflowStatus: row.workflow_status,
      studentOrgId: row.student_org_id,
      submittedBy: row.submitted_by,
      submittedAt: row.submitted_at,
      decidedAt: row.decided_at,
      requirements: normalized,
      allowedNextStatuses: ORG_ACCREDITATION_TRANSITIONS[String(row.workflow_status)] ?? [],
    }
  }

  async submitOrgApplication(input: {
    organizationId: string
    proposedName: string
    applicationType: 'new' | 'renewal'
    submittedBy: string
    requirementsJson?: Record<string, unknown> | null
  }) {
    const name = input.proposedName.trim()
    if (name.length < 3) {
      throw new EnrollmentWorkflowError('Proposed organization name is required', 422, 'INVALID_ORG_NAME')
    }
    const normalized = this.normalizeOrgRequirements(input.requirementsJson ?? {})
    const id = randomUUID()
    await db.table(t('org_applications')).insert({
      id,
      organization_id: input.organizationId,
      student_org_id: null,
      application_type: input.applicationType,
      proposed_name: name,
      workflow_status: 'osa',
      submitted_by: input.submittedBy,
      requirements_json: JSON.stringify({
        documents: normalized.documents,
        requirementsComplete: normalized.requirementsComplete,
        note: normalized.note,
      }),
      submitted_at: sqlNow(),
      decided_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.submittedBy,
      action: 'osa.org.submit',
      entityType: 'org_applications',
      entityId: id,
      metadata: {
        applicationType: input.applicationType,
        requirementsComplete: normalized.requirementsComplete,
      },
    })
    return this.getOrgApplication(input.organizationId, id)
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

    const current = String(app.workflow_status)
    if (['accredited', 'rejected'].includes(current)) {
      throw new EnrollmentWorkflowError('Application already decided', 409, 'ORG_ALREADY_DECIDED')
    }
    const allowed = ORG_ACCREDITATION_TRANSITIONS[current] ?? []
    if (!allowed.includes(input.workflowStatus)) {
      throw new EnrollmentWorkflowError(
        `Cannot move from ${current} to ${input.workflowStatus}`,
        422,
        'INVALID_ORG_TRANSITION'
      )
    }

    if (input.workflowStatus === 'vpsas' || input.workflowStatus === 'accredited') {
      const requirements =
        typeof app.requirements_json === 'string'
          ? (JSON.parse(app.requirements_json) as Record<string, unknown>)
          : ((app.requirements_json as Record<string, unknown> | null) ?? {})
      const normalized = this.normalizeOrgRequirements(requirements)
      if (!normalized.requirementsComplete) {
        throw new EnrollmentWorkflowError(
          `Requirements incomplete: ${normalized.missingRequired.join(', ')}`,
          422,
          'ORG_REQUIREMENTS_INCOMPLETE'
        )
      }
    }

    let studentOrgId = app.student_org_id as string | null
    let certificateRef = input.issueCertificateRef?.trim() || null
    if (input.workflowStatus === 'accredited') {
      if (!studentOrgId) {
        studentOrgId = randomUUID()
        const code = `ORG-${Date.now().toString(36).toUpperCase()}`
        certificateRef = certificateRef || `COA-${code}`
        await db.table(t('student_organizations')).insert({
          id: studentOrgId,
          organization_id: input.organizationId,
          code,
          name: app.proposed_name,
          status: 'active',
          accredited_at: sqlNow(),
          accreditation_certificate_ref: certificateRef,
          created_at: sqlNow(),
          updated_at: null,
        })
      } else if (certificateRef) {
        await db
          .from(t('student_organizations'))
          .where('id', studentOrgId)
          .update({
            accreditation_certificate_ref: certificateRef,
            accredited_at: sqlNow(),
            status: 'active',
            updated_at: sqlNow(),
          })
      }
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
      metadata: { workflowStatus: input.workflowStatus, certificateRef },
    })
    return this.getOrgApplication(input.organizationId, input.applicationId)
  }

  async orgAccreditationCertificate(organizationId: string, studentOrgId: string) {
    const org = await db
      .from(t('student_organizations'))
      .where({ id: studentOrgId, organization_id: organizationId })
      .first()
    if (!org) throw new EnrollmentWorkflowError('Accredited organization not found', 404, 'NOT_FOUND')
    if (!org.accredited_at) {
      throw new EnrollmentWorkflowError('Organization is not accredited', 409, 'NOT_ACCREDITED')
    }
    const { rowsToSimplePdf } = await import('#modules/enrollment/services/report_export')
    const rows = [
      {
        code: org.code,
        name: org.name,
        status: org.status,
        accreditedAt: org.accredited_at,
        certificateRef: org.accreditation_certificate_ref ?? '',
      },
    ]
    const body = rowsToSimplePdf(
      'Certificate of Accreditation — Student Organization',
      rows,
      [
        'Issued under USiS ENR-061 org accreditation workflow (OSA → VPSAS → Legal → President).',
        'Official checklist / signatory policy remain subject to university confirmation.',
      ]
    )
    const slug = String(org.code ?? 'org').replace(/[^a-zA-Z0-9_-]+/g, '_')
    return {
      contentType: 'application/pdf',
      filename: `coa-${slug}.pdf`,
      body,
      meta: rows[0],
    }
  }

  async studentParticipationProfile(organizationId: string, studentId: string) {
    const memberships = await db
      .from(t('org_memberships') as string)
      .leftJoin(
        t('student_organizations') as string,
        `${t('student_organizations')}.id`,
        `${t('org_memberships')}.student_org_id`
      )
      .where(`${t('org_memberships')}.organization_id`, organizationId)
      .where(`${t('org_memberships')}.student_id`, studentId)
      .select(
        `${t('org_memberships')}.id`,
        `${t('org_memberships')}.role_title`,
        `${t('org_memberships')}.status`,
        `${t('org_memberships')}.joined_at`,
        `${t('student_organizations')}.code as org_code`,
        `${t('student_organizations')}.name as org_name`
      )
      .limit(50)

    const openDiscipline = await db
      .from(t('discipline_cases'))
      .where({ organization_id: organizationId, student_id: studentId })
      .whereNotIn('workflow_status', ['closed', 'dismissed'])
      .orderBy('opened_at', 'desc')
      .limit(20)

    const clearance = await this.clearanceHints(organizationId, studentId)

    return {
      studentId,
      organizations: memberships.map((m) => ({
        membershipId: m.id,
        orgCode: m.org_code,
        orgName: m.org_name,
        roleTitle: m.role_title,
        status: m.status,
        joinedAt: m.joined_at,
      })),
      openDisciplineCases: openDiscipline.map((c) => ({
        id: c.id,
        workflowStatus: c.workflow_status,
        sdtEngaged: Boolean(c.sdt_engaged),
        openedAt: c.opened_at,
      })),
      clearanceHints: clearance,
      note: 'ENR-062 participation + OSA verification scaffold; RFID vendor and cashier payment validation remain [CONFIRM].',
    }
  }

  private digitalIdVerifyUrl(documentToken: string) {
    return `${digitalIdPublicWebBase()}/student-id/verify/${documentToken}`
  }

  private serializeStudentIdRequest(row: Record<string, unknown>) {
    const status = String(row.status)
    const digitalToken = row.digital_document_token ? String(row.digital_document_token) : null
    return {
      id: row.id,
      studentId: row.student_id,
      requestType: row.request_type,
      status,
      rfidRef: row.rfid_ref,
      paymentValidationRef: row.payment_validation_ref,
      printUnitStatus: row.print_unit_status,
      submittedAt: row.submitted_at,
      digitalDocumentToken: digitalToken,
      digitalSnapshotChecksum: row.digital_snapshot_checksum ? String(row.digital_snapshot_checksum) : null,
      digitalIssuedAt: row.digital_issued_at ?? null,
      digitalVerifyUrl: digitalToken ? this.digitalIdVerifyUrl(digitalToken) : null,
      allowedNextStatuses: STUDENT_ID_REQUEST_TRANSITIONS[status] ?? [],
    }
  }

  private async buildDigitalIdSnapshot(organizationId: string, studentId: string, requestRow: Record<string, unknown>) {
    const student = await Student.find(studentId)
    if (!student || student.organizationId !== organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    const participation = await this.studentParticipationProfile(organizationId, studentId)
    return {
      kind: 'provisional_digital_student_id',
      torId: 'ENR-062',
      requestId: String(requestRow.id),
      requestType: String(requestRow.request_type),
      studentId: student.id,
      studentNumber: student.studentNumber,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      yearLevel: student.yearLevel,
      programId: student.programId,
      status: student.status,
      paymentValidationRef: requestRow.payment_validation_ref ?? null,
      openDisciplineCount: participation.openDisciplineCases.length,
      organizationCount: participation.organizations.length,
      note: 'Provisional software digital ID (PDF+QR). Live RFID/print hardware remains [CONFIRM].',
      issuedAt: DateTime.now().toISO(),
    }
  }

  async listStudentIdRequests(organizationId: string, input?: { studentId?: string | null; limit?: number }) {
    let query = db
      .from(t('student_id_requests'))
      .where('organization_id', organizationId)
      .orderBy('submitted_at', 'desc')
      .limit(input?.limit ?? 50)
    if (input?.studentId) query = query.where('student_id', input.studentId)
    const rows = await query
    return rows.map((row) => this.serializeStudentIdRequest(row))
  }

  async getStudentIdRequest(organizationId: string, requestId: string) {
    const row = await db
      .from(t('student_id_requests'))
      .where({ id: requestId, organization_id: organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Student ID request not found', 404, 'NOT_FOUND')
    return this.serializeStudentIdRequest(row)
  }

  async requestStudentId(input: {
    organizationId: string
    studentId: string
    requestType: 'new' | 'replacement'
    submittedBy: string
  }) {
    if (!STUDENT_ID_REQUEST_TYPES.includes(input.requestType)) {
      throw new EnrollmentWorkflowError('Invalid ID request type', 422, 'INVALID_ID_REQUEST_TYPE')
    }
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }

    const open = await db
      .from(t('student_id_requests'))
      .where({
        organization_id: input.organizationId,
        student_id: input.studentId,
      })
      .whereNotIn('status', ['printed', 'rejected'])
      .first()
    if (open) {
      throw new EnrollmentWorkflowError('An active ID request already exists', 409, 'ID_REQUEST_OPEN')
    }

    const participation = await this.studentParticipationProfile(input.organizationId, input.studentId)
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
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.submittedBy,
      action: 'osa.student_id.submit',
      entityType: 'student_id_requests',
      entityId: id,
      metadata: {
        requestType: input.requestType,
        openDisciplineCount: participation.openDisciplineCases.length,
      },
    })
    return {
      ...(await this.getStudentIdRequest(input.organizationId, id)),
      osaSnapshot: {
        openDisciplineCount: participation.openDisciplineCases.length,
        organizationCount: participation.organizations.length,
        note: participation.note,
      },
    }
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
    const row = await db
      .from(t('student_id_requests'))
      .where({ id: input.requestId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('Student ID request not found', 404, 'NOT_FOUND')

    const current = String(row.status)
    if (['printed', 'rejected'].includes(current) && input.status && input.status !== current) {
      throw new EnrollmentWorkflowError('Request already decided', 409, 'ID_REQUEST_DECIDED')
    }

    if (input.status) {
      if (!STUDENT_ID_REQUEST_STATUSES.includes(input.status as (typeof STUDENT_ID_REQUEST_STATUSES)[number])) {
        throw new EnrollmentWorkflowError('Invalid ID request status', 422, 'INVALID_ID_STATUS')
      }
      const allowed = STUDENT_ID_REQUEST_TRANSITIONS[current] ?? []
      if (input.status !== current && !allowed.includes(input.status)) {
        throw new EnrollmentWorkflowError(
          `Cannot move from ${current} to ${input.status}`,
          422,
          'INVALID_ID_TRANSITION'
        )
      }
      if (input.status === 'osa_verified') {
        const profile = await this.studentParticipationProfile(input.organizationId, String(row.student_id))
        if (profile.openDisciplineCases.length > 0) {
          // Advisory only — university confirms whether open cases block IDs.
        }
      }
      if (input.status === 'payment_validated' && !(input.paymentValidationRef ?? row.payment_validation_ref)) {
        throw new EnrollmentWorkflowError(
          'paymentValidationRef required before payment_validated (cashier / UFMS path [CONFIRM])',
          422,
          'PAYMENT_REF_REQUIRED'
        )
      }
      if (input.status === 'printed' && !(input.rfidRef ?? row.rfid_ref)) {
        throw new EnrollmentWorkflowError(
          'rfidRef required before printed (RFID vendor integration [CONFIRM])',
          422,
          'RFID_REF_REQUIRED'
        )
      }
    }

    let printUnitStatus = input.printUnitStatus ?? undefined
    if (input.status === 'print_queued') printUnitStatus = printUnitStatus ?? 'queued'
    if (input.status === 'printed') printUnitStatus = printUnitStatus ?? 'printed'
    if (input.status === 'rejected') printUnitStatus = printUnitStatus ?? 'cancelled'

    const patch: Record<string, unknown> = {
      status: input.status ?? current,
      rfid_ref: input.rfidRef !== undefined ? input.rfidRef : row.rfid_ref,
      payment_validation_ref:
        input.paymentValidationRef !== undefined ? input.paymentValidationRef : row.payment_validation_ref,
      print_unit_status: printUnitStatus !== undefined ? printUnitStatus : row.print_unit_status,
      updated_at: sqlNow(),
    }

    if (input.status === 'digital_issued') {
      const snapshot = await this.buildDigitalIdSnapshot(
        input.organizationId,
        String(row.student_id),
        {
          ...row,
          payment_validation_ref:
            input.paymentValidationRef !== undefined ? input.paymentValidationRef : row.payment_validation_ref,
        }
      )
      const checksum = digitalIdChecksum(snapshot)
      const documentToken = row.digital_document_token ? String(row.digital_document_token) : randomUUID()
      patch.digital_document_token = documentToken
      patch.digital_snapshot_checksum = checksum
      patch.digital_snapshot_json = JSON.stringify(snapshot)
      patch.digital_issued_at = sqlNow()
      patch.digital_issued_by = input.actorUserId
    }

    await db.from(t('student_id_requests')).where('id', input.requestId).update(patch)
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'osa.student_id.update',
      entityType: 'student_id_requests',
      entityId: input.requestId,
      metadata: {
        status: input.status ?? current,
        digitalIssued: input.status === 'digital_issued',
      },
    })
    return this.getStudentIdRequest(input.organizationId, input.requestId)
  }

  async verifyDigitalStudentId(documentToken: string) {
    const row = await db
      .from(t('student_id_requests'))
      .where('digital_document_token', documentToken)
      .first()
    if (!row || !row.digital_snapshot_checksum) {
      return { valid: false as const, reason: 'not_found' as const }
    }
    const snapshotRaw = row.digital_snapshot_json
    const snapshot =
      typeof snapshotRaw === 'string'
        ? (JSON.parse(snapshotRaw) as Record<string, unknown>)
        : ((snapshotRaw as Record<string, unknown> | null) ?? {})
    const liveChecksum = digitalIdChecksum(snapshot)
    const checksumOk = liveChecksum === String(row.digital_snapshot_checksum)
    return {
      valid: checksumOk,
      documentToken: String(row.digital_document_token),
      snapshotChecksum: String(row.digital_snapshot_checksum),
      checksumMatches: checksumOk,
      issuedAt: row.digital_issued_at ?? null,
      status: String(row.status),
      requestType: String(row.request_type),
      studentNumber: String(snapshot.studentNumber ?? ''),
      studentName: String(snapshot.studentName ?? ''),
      provisional: true,
      verifyUrl: this.digitalIdVerifyUrl(String(row.digital_document_token)),
      note: String(snapshot.note ?? ''),
    }
  }

  async digitalStudentIdPdfPackage(organizationId: string, requestId: string) {
    const row = await db
      .from(t('student_id_requests'))
      .where({ id: requestId, organization_id: organizationId })
      .first()
    if (!row || !row.digital_document_token || !row.digital_snapshot_checksum) {
      return null
    }
    const snapshotRaw = row.digital_snapshot_json
    const snapshot =
      typeof snapshotRaw === 'string'
        ? (JSON.parse(snapshotRaw) as Record<string, unknown>)
        : ((snapshotRaw as Record<string, unknown> | null) ?? {})
    const verifyUrl = this.digitalIdVerifyUrl(String(row.digital_document_token))
    const { rowsToSimplePdf } = await import('#modules/enrollment/services/report_export')
    const body = rowsToSimplePdf(
      'WMSU USiS — Provisional digital student ID (ENR-062)',
      [
        {
          field: 'Student number',
          value: String(snapshot.studentNumber ?? ''),
        },
        {
          field: 'Name',
          value: String(snapshot.studentName ?? ''),
        },
        {
          field: 'Request',
          value: `${row.request_type} / ${row.status}`,
        },
        {
          field: 'Payment ref',
          value: String(snapshot.paymentValidationRef ?? row.payment_validation_ref ?? '—'),
        },
      ],
      [
        `Issued: ${row.digital_issued_at ?? ''}`,
        `Checksum: ${row.digital_snapshot_checksum}`,
        `QR validation URL: ${verifyUrl}`,
        'Provisional software credential until live RFID/print hardware is confirmed.',
      ]
    )
    const slug = String(snapshot.studentNumber || 'student').replace(/[^a-zA-Z0-9_-]+/g, '_')
    return {
      contentType: 'application/pdf',
      filename: `digital-id-${slug}-${String(row.digital_document_token).slice(0, 8)}.pdf`,
      body,
      meta: {
        documentToken: String(row.digital_document_token),
        verifyUrl,
        snapshotChecksum: String(row.digital_snapshot_checksum),
      },
    }
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
      program.eligibility_config,
      input.incomeClassification ?? null
    )
    if (eligibilitySnapshot.eligible === false) {
      throw new EnrollmentWorkflowError(
        'Applicant does not meet configured eligibility checks',
        422,
        'ELIGIBILITY_FAILED'
      )
    }

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

  async listScholarshipApplications(organizationId: string, filters?: { studentId?: string; status?: string }) {
    const q = db
      .from(`${t('scholarship_applications')} as a`)
      .leftJoin(`${t('scholarship_programs')} as p`, 'p.id', 'a.program_id')
      .leftJoin(`${t('students')} as st`, 'st.id', 'a.student_id')
      .where('a.organization_id', organizationId)
      .select(
        'a.id',
        'a.student_id',
        'a.program_id',
        'a.status',
        'a.income_classification',
        'a.submitted_at',
        'a.decided_at',
        'p.code as program_code',
        'p.name as program_name',
        'p.source_type',
        'st.student_number',
        'st.first_name',
        'st.last_name'
      )
      .orderBy('a.submitted_at', 'desc')
      .limit(100)
    if (filters?.studentId) q.andWhere('a.student_id', filters.studentId)
    if (filters?.status) q.andWhere('a.status', filters.status)
    const rows = await q
    return rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentNumber: r.student_number,
      studentName: r.last_name && r.first_name ? `${r.last_name}, ${r.first_name}` : null,
      programId: r.program_id,
      programCode: r.program_code,
      programName: r.program_name,
      sourceType: r.source_type,
      status: r.status,
      incomeClassification: r.income_classification,
      submittedAt: r.submitted_at,
      decidedAt: r.decided_at,
    }))
  }

  async listActiveScholarshipAwards(organizationId: string, studentId?: string) {
    const q = Scholarship.query()
      .where('organization_id', organizationId)
      .where('status', 'active')
      .orderBy('awarded_at', 'desc')
      .limit(100)
    if (studentId) q.where('student_id', studentId)
    const rows = await q
    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      scholarshipCode: r.scholarshipCode,
      name: r.name,
      amount: r.amount,
      status: r.status,
      awardStatus: r.awardStatus,
      awardedAt: r.awardedAt,
      programId: r.programId,
      applicationId: r.applicationId,
    }))
  }

  private async buildEligibilitySnapshot(
    organizationId: string,
    studentId: string,
    eligibilityConfigRaw: unknown,
    incomeClassification?: string | null
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

    const checks: Array<{ key: string; passed: boolean; detail: string }> = []
    if (config && typeof config.minLockedGradeCount === 'number') {
      const passed = grades.length >= Number(config.minLockedGradeCount)
      checks.push({
        key: 'minLockedGradeCount',
        passed,
        detail: `${grades.length}/${config.minLockedGradeCount}`,
      })
    }
    if (config && Array.isArray(config.allowedIncomeClassifications) && incomeClassification) {
      const allowed = config.allowedIncomeClassifications.map((v: unknown) => String(v).toLowerCase())
      const passed = allowed.includes(incomeClassification.toLowerCase())
      checks.push({
        key: 'allowedIncomeClassifications',
        passed,
        detail: incomeClassification,
      })
    }
    if (config && Array.isArray(config.allowedProgramIds) && student.programId) {
      const allowed = config.allowedProgramIds.map((v: unknown) => String(v))
      const passed = allowed.includes(String(student.programId))
      checks.push({
        key: 'allowedProgramIds',
        passed,
        detail: String(student.programId),
      })
    }

    const eligible = checks.length === 0 ? null : checks.every((c) => c.passed)

    return {
      studentNumber: student.studentNumber,
      programId: student.programId,
      yearLevel: student.yearLevel,
      lockedGradeCount: grades.length,
      incomeClassification: incomeClassification ?? null,
      eligibilityConfigPresent: Boolean(config),
      checks,
      eligible,
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

  private parseSaRequirements(raw: unknown) {
    if (!raw) {
      return {
        documents: SA_REQUIREMENT_KEYS_DEFAULT.map((key) => ({
          key,
          label: key.replaceAll('_', ' '),
          submitted: false,
        })),
        interviewScore: null as number | null,
        notes: null as string | null,
      }
    }
    const parsed =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>)
    const docs = Array.isArray(parsed.documents)
      ? (parsed.documents as Array<{ key: string; label?: string; submitted?: boolean }>)
      : SA_REQUIREMENT_KEYS_DEFAULT.map((key) => ({
          key,
          label: key.replaceAll('_', ' '),
          submitted: false,
        }))
    return {
      documents: docs.map((d) => ({
        key: d.key,
        label: d.label ?? d.key.replaceAll('_', ' '),
        submitted: Boolean(d.submitted),
      })),
      interviewScore: typeof parsed.interviewScore === 'number' ? parsed.interviewScore : null,
      notes: (parsed.notes as string | null | undefined) ?? null,
    }
  }

  private mapSaRow(row: Record<string, any>) {
    const requirements = this.parseSaRequirements(row.requirements_json)
    return {
      id: row.id,
      studentId: row.student_id,
      studentNumber: row.student_number ?? null,
      studentName: row.last_name && row.first_name ? `${row.last_name}, ${row.first_name}` : null,
      workflowStatus: row.workflow_status,
      requirements,
      requirementsComplete: requirements.documents.every((d) => d.submitted),
      deploymentOffice: row.deployment_office,
      interviewAt: row.interview_at,
      submittedAt: row.submitted_at,
      decidedAt: row.decided_at,
      note: 'SA interview scoring thresholds [CONFIRM] with Scholarship Office before production.',
    }
  }

  async submitSaApplication(input: {
    organizationId: string
    studentId: string
    requirementsJson?: Record<string, unknown> | null
    actorUserId?: string | null
  }) {
    const student = await Student.find(input.studentId)
    if (!student || student.organizationId !== input.organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    const requirements = this.parseSaRequirements(input.requirementsJson)
    const id = randomUUID()
    await db.table(t('student_assistant_applications')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      workflow_status: 'submitted',
      requirements_json: JSON.stringify(requirements),
      deployment_office: null,
      interview_at: null,
      submitted_at: sqlNow(),
      decided_at: null,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: 'sss.sa.submitted',
      subject: 'Student assistant application submitted',
      payload: { applicationId: id },
    })
    if (input.actorUserId) {
      await sssPrivacy.logOperational({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: 'scholarship.sa.submit',
        entityType: 'student_assistant_applications',
        entityId: id,
      })
    }
    return id
  }

  async listSaApplications(organizationId: string, filters?: { studentId?: string; workflowStatus?: string }) {
    const q = db
      .from(`${t('student_assistant_applications')} as a`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'a.student_id')
      .where('a.organization_id', organizationId)
      .select('a.*', 'st.student_number', 'st.first_name', 'st.last_name')
      .orderBy('a.submitted_at', 'desc')
      .limit(100)
    if (filters?.studentId) q.andWhere('a.student_id', filters.studentId)
    if (filters?.workflowStatus) q.andWhere('a.workflow_status', filters.workflowStatus)
    const rows = await q
    return rows.map((r) => this.mapSaRow(r))
  }

  async getSaApplication(organizationId: string, applicationId: string) {
    const row = await db
      .from(`${t('student_assistant_applications')} as a`)
      .leftJoin(`${t('students')} as st`, 'st.id', 'a.student_id')
      .where('a.id', applicationId)
      .where('a.organization_id', organizationId)
      .select('a.*', 'st.student_number', 'st.first_name', 'st.last_name')
      .first()
    if (!row) throw new EnrollmentWorkflowError('SA application not found', 404, 'NOT_FOUND')
    return this.mapSaRow(row)
  }

  async updateSaRequirements(input: {
    organizationId: string
    applicationId: string
    documents: Array<{ key: string; submitted: boolean; label?: string }>
    actorUserId: string
  }) {
    const row = await db
      .from(t('student_assistant_applications'))
      .where({ id: input.applicationId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('SA application not found', 404, 'NOT_FOUND')
    if (['deployed', 'rejected'].includes(row.workflow_status)) {
      throw new EnrollmentWorkflowError('SA application is closed for requirement edits', 409, 'CLOSED')
    }
    const current = this.parseSaRequirements(row.requirements_json)
    const byKey = new Map(input.documents.map((d) => [d.key, d]))
    const documents = current.documents.map((d) => {
      const next = byKey.get(d.key)
      return next ? { key: d.key, label: next.label ?? d.label, submitted: Boolean(next.submitted) } : d
    })
    await db
      .from(t('student_assistant_applications'))
      .where({ id: input.applicationId })
      .update({
        requirements_json: JSON.stringify({ ...current, documents }),
        updated_at: sqlNow(),
      })
    return this.getSaApplication(input.organizationId, input.applicationId)
  }

  async scheduleSaInterview(input: {
    organizationId: string
    applicationId: string
    interviewAt: string
    actorUserId: string
  }) {
    const row = await db
      .from(t('student_assistant_applications'))
      .where({ id: input.applicationId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('SA application not found', 404, 'NOT_FOUND')
    if (!['cjpc', 'screening_committee'].includes(row.workflow_status)) {
      throw new EnrollmentWorkflowError(
        'Interview scheduling allowed at CJPC/screening stages only',
        422,
        'INVALID_SA_STAGE'
      )
    }
    const when = DateTime.fromISO(input.interviewAt)
    if (!when.isValid) throw new EnrollmentWorkflowError('Invalid interviewAt', 422, 'INVALID_INTERVIEW_AT')
    const current = this.parseSaRequirements(row.requirements_json)
    await db
      .from(t('student_assistant_applications'))
      .where({ id: input.applicationId })
      .update({
        interview_at: when.toSQL(),
        requirements_json: JSON.stringify(current),
        updated_at: sqlNow(),
      })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: row.student_id,
      templateCode: 'sss.sa.interview_scheduled',
      subject: 'SA interview scheduled',
      payload: { applicationId: input.applicationId, interviewAt: input.interviewAt },
    })
    return this.getSaApplication(input.organizationId, input.applicationId)
  }

  async advanceSaApplication(input: {
    organizationId: string
    applicationId: string
    workflowStatus: string
    deploymentOffice?: string | null
    interviewScore?: number | null
    actorUserId: string
  }) {
    if (!SA_WORKFLOW_STATUSES.includes(input.workflowStatus as (typeof SA_WORKFLOW_STATUSES)[number])) {
      throw new EnrollmentWorkflowError('Invalid SA workflow status', 422, 'INVALID_WORKFLOW_STATUS')
    }
    const row = await db
      .from(t('student_assistant_applications'))
      .where({ id: input.applicationId, organization_id: input.organizationId })
      .first()
    if (!row) throw new EnrollmentWorkflowError('SA application not found', 404, 'NOT_FOUND')
    const allowed = SA_WORKFLOW_TRANSITIONS[row.workflow_status] ?? []
    if (!allowed.includes(input.workflowStatus)) {
      throw new EnrollmentWorkflowError(
        `Cannot transition SA ${row.workflow_status} → ${input.workflowStatus}`,
        422,
        'INVALID_SA_TRANSITION'
      )
    }
    if (input.workflowStatus === 'deployed' && !input.deploymentOffice?.trim() && !row.deployment_office) {
      throw new EnrollmentWorkflowError('deploymentOffice required to deploy SA', 422, 'DEPLOYMENT_OFFICE_REQUIRED')
    }
    const current = this.parseSaRequirements(row.requirements_json)
    if (!current.documents.every((d) => d.submitted) && input.workflowStatus !== 'rejected') {
      throw new EnrollmentWorkflowError('SA requirements incomplete', 422, 'SA_REQUIREMENTS_INCOMPLETE')
    }
    await db
      .from(t('student_assistant_applications'))
      .where({ id: input.applicationId, organization_id: input.organizationId })
      .update({
        workflow_status: input.workflowStatus,
        deployment_office: input.deploymentOffice ?? row.deployment_office,
        requirements_json: JSON.stringify({
          ...current,
          interviewScore:
            typeof input.interviewScore === 'number' ? input.interviewScore : current.interviewScore,
        }),
        decided_at: ['deployed', 'rejected'].includes(input.workflowStatus) ? sqlNow() : null,
        updated_at: sqlNow(),
      })
    await sssPrivacy.logOperational({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'scholarship.sa.advance',
      entityType: 'student_assistant_applications',
      entityId: input.applicationId,
      metadata: { workflowStatus: input.workflowStatus, deploymentOffice: input.deploymentOffice ?? null },
    })
    if (input.workflowStatus === 'deployed') {
      await sssPrivacy.enqueueNotification({
        organizationId: input.organizationId,
        studentId: row.student_id,
        templateCode: 'sss.sa.deployed',
        subject: 'Student assistant deployed',
        payload: {
          applicationId: input.applicationId,
          deploymentOffice: input.deploymentOffice ?? row.deployment_office,
        },
      })
    }
    return this.getSaApplication(input.organizationId, input.applicationId)
  }

  async scholarshipAssistanceReport(organizationId: string) {
    const applications = await this.listScholarshipApplications(organizationId)
    const awards = await this.listActiveScholarshipAwards(organizationId)
    const saApps = await this.listSaApplications(organizationId)
    const fundUtilization = awards.reduce((sum, a) => sum + Number(a.amount ?? 0), 0)
    const bySource = applications.reduce(
      (acc, row) => {
        const key = String(row.sourceType ?? 'unknown')
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const saByStatus = saApps.reduce(
      (acc, row) => {
        acc[row.workflowStatus] = (acc[row.workflowStatus] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const deployments = saApps
      .filter((a) => a.workflowStatus === 'deployed')
      .map((a) => ({
        applicationId: a.id,
        studentNumber: a.studentNumber,
        studentName: a.studentName,
        deploymentOffice: a.deploymentOffice,
        decidedAt: a.decidedAt,
      }))

    return {
      scholarsAndGrantees: awards.map((a) => ({
        awardId: a.id,
        studentId: a.studentId,
        scholarshipCode: a.scholarshipCode,
        name: a.name,
        amount: a.amount,
        status: a.status,
      })),
      applicationsByStatus: applications.reduce(
        (acc, row) => {
          acc[row.status] = (acc[row.status] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
      applicationsBySource: bySource,
      fundUtilizationTotal: fundUtilization,
      activeAwardCount: awards.length,
      saByStatus,
      saDeployments: deployments,
      note: 'Sponsor billing/receivables and UniFAST posting remain [CONFIRM] with UFMS integration contracts.',
    }
  }

  async clearanceHints(organizationId: string, studentId: string) {
    return this.crossOfficeClearanceCheck(organizationId, studentId)
  }

  async crossOfficeClearanceCheck(organizationId: string, studentId: string) {
    const pendingCounseling = await db
      .from(t('counseling_requests'))
      .where({ organization_id: organizationId, student_id: studentId })
      .whereNotIn('status', ['resolved', 'closed', 'cancelled'])
      .first()
    let upcomingCounseling: Record<string, unknown> | null = null
    try {
      upcomingCounseling = await db
        .from(t('counseling_sessions'))
        .where({ organization_id: organizationId, student_id: studentId })
        .where('session_at', '>=', sqlNow())
        .whereNotIn('status', ['cancelled', 'completed'])
        .orderBy('session_at', 'asc')
        .first()
    } catch {
      upcomingCounseling = null
    }
    const health = await this.getLatestHealthClearance(organizationId, studentId)
    const openDiscipline = await db
      .from(t('discipline_cases'))
      .where({ organization_id: organizationId, student_id: studentId })
      .whereNotIn('workflow_status', ['closed', 'dismissed'])
      .first()
    const scholarshipObligations = await Scholarship.query().where({
      organization_id: organizationId,
      student_id: studentId,
      status: 'active',
    })
    const openGuidanceReferrals = await db
      .from(t('guidance_referrals'))
      .where({ organization_id: organizationId, student_id: studentId, status: 'open' })
      .count('* as total')
    const openHealthReferrals = await db
      .from(t('health_referrals'))
      .where({ organization_id: organizationId, student_id: studentId, status: 'open' })
      .count('* as total')

    const guidanceHold = Boolean(pendingCounseling)
    const healthHold = health ? health.status !== 'cleared' : true
    const osaHold = Boolean(openDiscipline)
    const scholarshipNote = scholarshipObligations.length

    const offices = {
      guidance: {
        cleared: !guidanceHold,
        pendingCounselingCases: guidanceHold,
        upcomingSessionAt: upcomingCounseling?.session_at ?? null,
      },
      health: {
        cleared: !healthHold,
        clearanceStatus: health?.status ?? 'unknown',
      },
      osa: {
        cleared: !osaHold,
        openDisciplinaryCases: osaHold,
      },
      scholarship: {
        cleared: true,
        activeAwards: scholarshipNote,
        note: 'Scholarship obligations are informational until university confirms enrollment-gate rules.',
      },
    }

    const holdOffices = (['guidance', 'health', 'osa'] as const).filter((k) => !offices[k].cleared)

    return {
      studentId,
      enrollmentGateMode: 'advisory' as const,
      overallAdvisoryCleared: holdOffices.length === 0,
      holdOffices,
      offices,
      openReferrals: {
        guidance: Number((openGuidanceReferrals[0] as { total?: string | number })?.total ?? 0),
        health: Number((openHealthReferrals[0] as { total?: string | number })?.total ?? 0),
      },
      note: 'ENR-063 clearance gate semantics [CONFIRM] with Registrar/offices before blocking enrollment. Current mode is advisory-only.',
    }
  }

  async createOfficeReferral(input: {
    organizationId: string
    studentId: string
    fromOffice: 'guidance' | 'health'
    toOffice: 'guidance' | 'health' | 'osa' | 'scholarship'
    reasonSummary?: string | null
    createdBy: string
    fromRequestId?: string | null
    encounterId?: string | null
  }) {
    if (input.fromOffice === input.toOffice) {
      throw new EnrollmentWorkflowError('Referral must target a different office', 422, 'INVALID_REFERRAL')
    }
    if (input.fromOffice === 'guidance') {
      const created = await this.createGuidanceReferral({
        organizationId: input.organizationId,
        studentId: input.studentId,
        fromRequestId: input.fromRequestId ?? null,
        toOffice: input.toOffice as SssOffice,
        reasonSummary: input.reasonSummary ?? null,
        createdBy: input.createdBy,
        markReferred: false,
      })
      return { id: created.referralId, channel: 'guidance_referrals' as const }
    }

    const id = randomUUID()
    await db.table(t('health_referrals')).insert({
      id,
      organization_id: input.organizationId,
      student_id: input.studentId,
      encounter_id: input.encounterId ?? null,
      to_facility: null,
      to_office: input.toOffice,
      is_hospital: false,
      status: 'open',
      created_by: input.createdBy,
      created_at: sqlNow(),
      updated_at: null,
    })
    await sssPrivacy.enqueueNotification({
      organizationId: input.organizationId,
      studentId: input.studentId,
      templateCode: 'sss.referral.created',
      payload: { referralId: id, fromOffice: 'health', toOffice: input.toOffice },
      subject: `Referral to ${input.toOffice}`,
    })
    return { id, channel: 'health_referrals' as const }
  }

  async listOfficeReferrals(organizationId: string, studentId: string) {
    const guidance = await db
      .from(t('guidance_referrals'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('created_at', 'desc')
      .limit(30)
    const health = await db
      .from(t('health_referrals'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('created_at', 'desc')
      .limit(30)
    return {
      guidance: guidance.map((r) => ({
        id: r.id,
        fromOffice: r.from_office,
        toOffice: r.to_office,
        status: r.status,
        reasonSummary: r.reason_summary,
        createdAt: r.created_at,
      })),
      health: health.map((r) => ({
        id: r.id,
        toOffice: r.to_office,
        toFacility: r.to_facility,
        status: r.status,
        createdAt: r.created_at,
      })),
    }
  }

  async listStudentAlerts(organizationId: string, studentId: string, limit = 40) {
    const rows = await db
      .from(t('sss_notifications_outbox'))
      .where({ organization_id: organizationId, student_id: studentId })
      .orderBy('created_at', 'desc')
      .limit(limit)
    return rows.map((r) => ({
      id: r.id,
      templateCode: r.template_code,
      subject: r.subject,
      channel: r.channel,
      status: r.status,
      scheduledAt: r.scheduled_at,
      createdAt: r.created_at,
      payload:
        typeof r.payload === 'string'
          ? (JSON.parse(r.payload) as Record<string, unknown>)
          : ((r.payload as Record<string, unknown> | null) ?? null),
    }))
  }

  async unifiedStudentSupportProfile(organizationId: string, studentId: string, actorUserId: string) {
    const student = await Student.find(studentId)
    if (!student || student.organizationId !== organizationId) {
      throw new EnrollmentWorkflowError('Student not found', 404, 'STUDENT_NOT_FOUND')
    }
    await sssPrivacy.logSensitiveAccess({
      organizationId,
      actorUserId,
      office: 'osa',
      entityType: 'unified_student_profile',
      entityId: studentId,
      studentId,
      purpose: 'enr063_cross_office_review',
    })

    const clearance = await this.crossOfficeClearanceCheck(organizationId, studentId)
    const referrals = await this.listOfficeReferrals(organizationId, studentId)
    const alerts = await this.listStudentAlerts(organizationId, studentId, 20)
    const participation = await this.studentParticipationProfile(organizationId, studentId)

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: `${student.lastName}, ${student.firstName}`,
        status: student.status,
      },
      clearance,
      referrals,
      alerts,
      organizations: participation.organizations,
      openDisciplineCases: participation.openDisciplineCases,
      note: 'Unified SSS profile consolidates advisory clearance, referrals, alerts, orgs, and discipline. Clinical note bodies are not included.',
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
