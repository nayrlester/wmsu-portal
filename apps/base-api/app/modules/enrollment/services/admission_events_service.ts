import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import Applicant from '#modules/enrollment/models/applicant'
import Program from '#modules/enrollment/models/program'
import UsisAdmissionEvent, {
  type AdmissionDeliveryMode,
  type AdmissionEventType,
  type AdmissionExamQuestion,
} from '#modules/enrollment/models/usis_admission_event'
import UsisAdmissionEventResult, {
  type AdmissionEventResultValue,
} from '#modules/enrollment/models/usis_admission_event_result'
import UsisApplicantStatusHistory from '#modules/enrollment/models/usis_applicant_status_history'
import { STUDENT_CLASSIFICATIONS } from '#modules/enrollment/domain/enrollment_workflow'
import {
  buildProgramGuidance,
  normalizeAcademicStrand,
  normalizeSecondaryBackground,
  scoreExamStrandSuggestion,
  type AcademicStrand,
  type SecondaryBackground,
} from '#modules/enrollment/domain/shs_academic_guidance'
import type { AdmissionExamStrandTag } from '#modules/enrollment/models/usis_admission_event'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

const EVENT_TYPES: AdmissionEventType[] = ['entrance_exam', 'interview', 'assessment']
const RESULT_VALUES: AdmissionEventResultValue[] = ['pending', 'pass', 'fail', 'waived']
const DELIVERY_MODES: AdmissionDeliveryMode[] = ['onsite', 'online', 'hybrid']
const GUEST_CLASSIFICATIONS = ['new', 'freshman', 'transferee', 'returning'] as const
const DEFAULT_PASS_SCORE = 70

function badRequest(message: string) {
  return new Exception(message, { status: 422, code: 'E_VALIDATION_FAILURE' })
}

function parseOptionalDateTime(value: string | null | undefined, field: string) {
  if (value == null || value === '') return null
  const dt = DateTime.fromISO(value)
  if (!dt.isValid) throw badRequest(`${field} must be a valid ISO datetime`)
  return dt
}

const STRAND_TAGS: AdmissionExamStrandTag[] = ['ABM', 'STEM', 'HUMSS', 'GAS', 'general']

function normalizeQuestions(raw: AdmissionExamQuestion[] | undefined | null) {
  if (!raw || raw.length === 0) return [] as AdmissionExamQuestion[]
  return raw.map((q, index) => {
    const choices = Array.isArray(q.choices) ? q.choices.map((c) => String(c).trim()).filter(Boolean) : []
    if (choices.length < 2) throw badRequest(`Question ${index + 1} needs at least 2 choices`)
    const correctIndex = Number(q.correctIndex)
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
      throw badRequest(`Question ${index + 1} has an invalid correctIndex`)
    }
    const rawTag = String(q.strandTag || 'general').trim().toUpperCase()
    const strandTag = (STRAND_TAGS as string[]).includes(rawTag)
      ? (rawTag as AdmissionExamStrandTag)
      : ('general' as AdmissionExamStrandTag)
    return {
      id: (q.id || `q${index + 1}`).trim(),
      prompt: String(q.prompt || '').trim(),
      choices,
      correctIndex,
      strandTag,
    }
  }).filter((q) => q.prompt.length > 0)
}

function isOnlineCapable(mode: AdmissionDeliveryMode | string | null | undefined) {
  return mode === 'online' || mode === 'hybrid'
}

function examWindowOpen(event: UsisAdmissionEvent, now = DateTime.now()) {
  if (event.windowOpensAt && now < event.windowOpensAt) return false
  if (event.windowClosesAt && now > event.windowClosesAt) return false
  return true
}

function publicQuestion(q: AdmissionExamQuestion) {
  return { id: q.id, prompt: q.prompt, choices: q.choices, strandTag: q.strandTag ?? 'general' }
}

export class AdmissionEventsService {
  async listEvents(organizationId: string, eventType?: string) {
    const q = UsisAdmissionEvent.query()
      .where('organization_id', organizationId)
      .orderBy('scheduled_at', 'asc')
    if (eventType) q.where('event_type', eventType)
    return q
  }

  async createEvent(
    organizationId: string,
    data: {
      eventType: AdmissionEventType
      title: string
      scheduledAt: string
      location?: string | null
      capacity?: number | null
      notes?: string | null
      isActive?: boolean
      deliveryMode?: AdmissionDeliveryMode
      passScore?: number | null
      durationMinutes?: number | null
      windowOpensAt?: string | null
      windowClosesAt?: string | null
      questions?: AdmissionExamQuestion[] | null
    },
    actorUserId: string
  ) {
    if (!EVENT_TYPES.includes(data.eventType)) {
      throw badRequest('eventType must be entrance_exam, interview, or assessment')
    }
    const deliveryMode = data.deliveryMode ?? 'onsite'
    if (!DELIVERY_MODES.includes(deliveryMode)) {
      throw badRequest('deliveryMode must be onsite, online, or hybrid')
    }
    const scheduledAt = DateTime.fromISO(data.scheduledAt)
    if (!scheduledAt.isValid) throw badRequest('scheduledAt must be a valid ISO datetime')
    const questions = normalizeQuestions(data.questions)
    if (isOnlineCapable(deliveryMode) && data.eventType === 'entrance_exam' && questions.length === 0) {
      throw badRequest('Online entrance exams require at least one question')
    }

    const row = await UsisAdmissionEvent.create({
      organizationId,
      eventType: data.eventType,
      title: data.title.trim(),
      scheduledAt,
      location: data.location?.trim() || null,
      capacity: data.capacity ?? null,
      notes: data.notes?.trim() || null,
      isActive: data.isActive ?? true,
      deliveryMode,
      passScore: data.passScore ?? (isOnlineCapable(deliveryMode) ? DEFAULT_PASS_SCORE : null),
      durationMinutes: data.durationMinutes ?? (isOnlineCapable(deliveryMode) ? 60 : null),
      windowOpensAt: parseOptionalDateTime(data.windowOpensAt, 'windowOpensAt'),
      windowClosesAt: parseOptionalDateTime(data.windowClosesAt, 'windowClosesAt'),
      questionsJson: questions,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_admission_event',
      entityId: row.id,
    })
    return row
  }

  async updateEvent(
    organizationId: string,
    id: string,
    data: Partial<{
      title: string
      scheduledAt: string
      location: string | null
      capacity: number | null
      notes: string | null
      isActive: boolean
      deliveryMode: AdmissionDeliveryMode
      passScore: number | null
      durationMinutes: number | null
      windowOpensAt: string | null
      windowClosesAt: string | null
      questions: AdmissionExamQuestion[] | null
    }>,
    actorUserId: string
  ) {
    const row = await UsisAdmissionEvent.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .firstOrFail()

    if (data.title !== undefined) row.title = data.title.trim()
    if (data.scheduledAt !== undefined) {
      const scheduledAt = DateTime.fromISO(data.scheduledAt)
      if (!scheduledAt.isValid) throw badRequest('scheduledAt must be a valid ISO datetime')
      row.scheduledAt = scheduledAt
    }
    if (data.location !== undefined) row.location = data.location?.trim() || null
    if (data.capacity !== undefined) row.capacity = data.capacity
    if (data.notes !== undefined) row.notes = data.notes?.trim() || null
    if (data.isActive !== undefined) row.isActive = data.isActive
    if (data.deliveryMode !== undefined) {
      if (!DELIVERY_MODES.includes(data.deliveryMode)) {
        throw badRequest('deliveryMode must be onsite, online, or hybrid')
      }
      row.deliveryMode = data.deliveryMode
    }
    if (data.passScore !== undefined) row.passScore = data.passScore
    if (data.durationMinutes !== undefined) row.durationMinutes = data.durationMinutes
    if (data.windowOpensAt !== undefined) {
      row.windowOpensAt = parseOptionalDateTime(data.windowOpensAt, 'windowOpensAt')
    }
    if (data.windowClosesAt !== undefined) {
      row.windowClosesAt = parseOptionalDateTime(data.windowClosesAt, 'windowClosesAt')
    }
    if (data.questions !== undefined) {
      row.questionsJson = normalizeQuestions(data.questions)
    }
    if (
      isOnlineCapable(row.deliveryMode) &&
      row.eventType === 'entrance_exam' &&
      (row.questionsJson?.length ?? 0) === 0
    ) {
      throw badRequest('Online entrance exams require at least one question')
    }
    await row.save()

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_admission_event',
      entityId: row.id,
    })
    return row
  }

  async recordStatusChange(input: {
    organizationId: string
    applicantId: string
    fromStatus: string | null
    toStatus: string
    note?: string | null
    actorUserId?: string | null
  }) {
    return UsisApplicantStatusHistory.create({
      organizationId: input.organizationId,
      applicantId: input.applicantId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      note: input.note ?? null,
      actorUserId: input.actorUserId ?? null,
    })
  }

  async listStatusHistory(organizationId: string, applicantId: string) {
    return UsisApplicantStatusHistory.query()
      .where('organization_id', organizationId)
      .where('applicant_id', applicantId)
      .orderBy('created_at', 'asc')
  }

  async assignApplicant(
    organizationId: string,
    data: { eventId: string; applicantId: string },
    actorUserId?: string | null
  ) {
    const event = await UsisAdmissionEvent.query()
      .where('organization_id', organizationId)
      .where('id', data.eventId)
      .firstOrFail()

    const applicant = await Applicant.query()
      .where('organization_id', organizationId)
      .where('id', data.applicantId)
      .firstOrFail()

    if (event.capacity != null) {
      const assigned = await UsisAdmissionEventResult.query().where('event_id', event.id).count('* as total')
      const total = Number(assigned[0]?.$extras?.total ?? 0)
      if (total >= event.capacity) throw badRequest('Event capacity is full')
    }

    let row = await UsisAdmissionEventResult.query()
      .where('event_id', event.id)
      .where('applicant_id', applicant.id)
      .first()

    if (!row) {
      row = await UsisAdmissionEventResult.create({
        organizationId,
        eventId: event.id,
        applicantId: applicant.id,
        score: null,
        result: 'pending',
        remarks: null,
        recordedBy: null,
        recordedAt: null,
      })
    }

    if (applicant.status === 'pending') {
      const from = applicant.status
      applicant.status = 'scheduled'
      await applicant.save()
      await this.recordStatusChange({
        organizationId,
        applicantId: applicant.id,
        fromStatus: from,
        toStatus: 'scheduled',
        note: `Assigned to ${event.eventType}: ${event.title}`,
        actorUserId,
      })
    }

    await auditLogService.log({
      organizationId,
      actorUserId: actorUserId ?? undefined,
      action: AuditAction.CREATE,
      entityType: 'usis_admission_event_result',
      entityId: row.id,
      metadata: { eventId: event.id, applicantId: applicant.id },
    })

    return row
  }

  async recordResult(
    organizationId: string,
    data: {
      eventId: string
      applicantId: string
      score?: number | null
      result: AdmissionEventResultValue
      remarks?: string | null
    },
    actorUserId: string
  ) {
    if (!RESULT_VALUES.includes(data.result)) {
      throw badRequest('result must be pending, pass, fail, or waived')
    }

    await UsisAdmissionEvent.query()
      .where('organization_id', organizationId)
      .where('id', data.eventId)
      .firstOrFail()

    const applicant = await Applicant.query()
      .where('organization_id', organizationId)
      .where('id', data.applicantId)
      .firstOrFail()

    let row = await UsisAdmissionEventResult.query()
      .where('event_id', data.eventId)
      .where('applicant_id', data.applicantId)
      .first()

    if (!row) {
      row = await UsisAdmissionEventResult.create({
        organizationId,
        eventId: data.eventId,
        applicantId: data.applicantId,
        score: data.score ?? null,
        result: data.result,
        remarks: data.remarks?.trim() || null,
        recordedBy: actorUserId,
        recordedAt: DateTime.now(),
      })
    } else {
      row.score = data.score ?? null
      row.result = data.result
      row.remarks = data.remarks?.trim() || null
      row.recordedBy = actorUserId
      row.recordedAt = DateTime.now()
      await row.save()
    }

    if (data.result !== 'pending' && !['admitted', 'rejected'].includes(applicant.status)) {
      const from = applicant.status
      applicant.status = 'under_review'
      await applicant.save()
      await this.recordStatusChange({
        organizationId,
        applicantId: applicant.id,
        fromStatus: from,
        toStatus: 'under_review',
        note: `Result recorded: ${data.result}`,
        actorUserId,
      })
    }

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_admission_event_result',
      entityId: row.id,
      metadata: { result: data.result, score: data.score ?? null },
    })

    return row
  }

  async listEventResults(organizationId: string, eventId: string) {
    return UsisAdmissionEventResult.query()
      .where('organization_id', organizationId)
      .where('event_id', eventId)
      .preload('applicant')
      .orderBy('created_at', 'asc')
  }

  async listApplicantResults(organizationId: string, applicantId: string) {
    return UsisAdmissionEventResult.query()
      .where('organization_id', organizationId)
      .where('applicant_id', applicantId)
      .preload('event')
      .orderBy('created_at', 'asc')
  }

  async findApplicantByReceipt(input: {
    organizationId: string
    applicationNumber: string
    email: string
  }) {
    const applicationNumber = input.applicationNumber.trim()
    const email = input.email.trim().toLowerCase()
    if (!applicationNumber || !email) {
      throw badRequest('applicationNumber and email are required')
    }

    const applicant = await Applicant.query()
      .where('organization_id', input.organizationId)
      .where('application_number', applicationNumber)
      .whereRaw('LOWER(email) = ?', [email])
      .first()

    if (!applicant) {
      throw new Exception('Application not found for the given application number and email', {
        status: 404,
        code: 'E_NOT_FOUND',
      })
    }
    return applicant
  }

  readSecondaryProfile(applicant: Applicant) {
    const answers = applicant.formAnswers ?? {}
    const secondaryBackground = normalizeSecondaryBackground(answers.secondaryBackground)
    const academicStrand =
      secondaryBackground === 'shs_academic'
        ? normalizeAcademicStrand(answers.academicStrand)
        : null
    return { secondaryBackground, academicStrand }
  }

  async lookupPortalStatus(input: {
    organizationId: string
    applicationNumber: string
    email: string
  }) {
    const applicant = await this.findApplicantByReceipt(input)
    const [history, results, openOnlineExams, program, programs] = await Promise.all([
      this.listStatusHistory(input.organizationId, applicant.id),
      this.listApplicantResults(input.organizationId, applicant.id),
      this.listOpenOnlineEntranceExams(input.organizationId),
      applicant.programId
        ? Program.query()
            .where('organization_id', input.organizationId)
            .where('id', applicant.programId)
            .first()
        : Promise.resolve(null),
      this.listPublicPrograms(input.organizationId),
    ])

    const { secondaryBackground, academicStrand } = this.readSecondaryProfile(applicant)
    const entranceExamOutcome =
      (applicant.formAnswers?.entranceExamOutcome as Record<string, unknown> | undefined) ?? null
    const examSuggestedStrand = normalizeAcademicStrand(entranceExamOutcome?.suggestedStrand)
    const programGuidance = buildProgramGuidance({
      secondaryBackground,
      academicStrand,
      examSuggestedStrand,
      programs: programs.map((p) => ({ id: p.id, code: p.code, name: p.name })),
    })

    return {
      applicant,
      history,
      results,
      openOnlineExams,
      program,
      secondaryBackground,
      academicStrand,
      entranceExamOutcome,
      programGuidance,
      journey: this.buildJourney(applicant, results, openOnlineExams),
    }
  }

  async listOpenOnlineEntranceExams(organizationId: string) {
    const now = DateTime.now()
    const rows = await UsisAdmissionEvent.query()
      .where('organization_id', organizationId)
      .where('event_type', 'entrance_exam')
      .where('is_active', true)
      .whereIn('delivery_mode', ['online', 'hybrid'])
      .orderBy('scheduled_at', 'asc')

    return rows.filter((event) => {
      if ((event.questionsJson?.length ?? 0) === 0) return false
      return examWindowOpen(event, now)
    })
  }

  async listPublicPrograms(organizationId: string) {
    return Program.query()
      .where('organization_id', organizationId)
      .where('is_active', true)
      .orderBy('name', 'asc')
  }

  buildJourney(
    applicant: Applicant,
    results: UsisAdmissionEventResult[],
    openOnlineExams: UsisAdmissionEvent[]
  ) {
    const classification = applicant.classification
    const needsEntranceExam =
      classification === 'new' || classification === 'freshman' || classification == null
    const entranceResults = results.filter((r) => r.event?.eventType === 'entrance_exam')
    const passedExam = entranceResults.some((r) => r.result === 'pass' || r.result === 'waived')
    const failedPendingRetry = entranceResults.some((r) => r.result === 'fail')
    const pendingOnline = entranceResults.find(
      (r) =>
        r.result === 'pending' &&
        isOnlineCapable(r.event?.deliveryMode ?? null) &&
        (r.event?.questionsJson?.length ?? 0) > 0
    )
    const requirements = (applicant.formAnswers?.requirementsChecklist as string[] | undefined) ?? []
    const requirementsSubmitted = Boolean(applicant.formAnswers?.requirementsSubmitted)
    const canJoinOpenExam =
      needsEntranceExam &&
      !passedExam &&
      !pendingOnline &&
      openOnlineExams.length > 0 &&
      !['admitted', 'rejected'].includes(applicant.status)

    const takeExamEventId = pendingOnline?.eventId ?? (canJoinOpenExam ? openOnlineExams[0]?.id : null)

    const steps = [
      {
        id: 'applied',
        label: 'Application submitted',
        status: 'done' as const,
      },
      {
        id: 'exam',
        label: needsEntranceExam
          ? 'Entrance examination'
          : classification === 'transferee'
            ? 'TOR / interview evaluation'
            : 'Returning clearance',
        status: needsEntranceExam
          ? passedExam
            ? ('done' as const)
            : failedPendingRetry || pendingOnline || canJoinOpenExam
              ? ('current' as const)
              : ('upcoming' as const)
          : results.some((r) => r.result === 'pass' || r.result === 'waived')
            ? ('done' as const)
            : applicant.status === 'scheduled' || applicant.status === 'under_review'
              ? ('current' as const)
              : ('upcoming' as const),
      },
      {
        id: 'program',
        label: 'Program selection',
        status: applicant.programId
          ? ('done' as const)
          : passedExam || !needsEntranceExam
            ? ('current' as const)
            : ('upcoming' as const),
      },
      {
        id: 'requirements',
        label: 'Requirements checklist',
        status: requirementsSubmitted
          ? ('done' as const)
          : applicant.programId || !needsEntranceExam
            ? ('current' as const)
            : ('upcoming' as const),
      },
      {
        id: 'admit',
        label: 'Admission decision',
        status:
          applicant.status === 'admitted'
            ? ('done' as const)
            : requirementsSubmitted
              ? ('current' as const)
              : ('upcoming' as const),
      },
    ]

    return {
      classification,
      needsEntranceExam,
      passedExam,
      canTakeExam: Boolean(takeExamEventId) && !['admitted', 'rejected'].includes(applicant.status),
      takeExamEventId,
      canJoinOpenExam,
      requirements,
      requirementsSubmitted,
      programId: applicant.programId,
      steps,
      nextAction: steps.find((s) => s.status === 'current')?.id ?? null,
    }
  }

  async updateGuestJourney(input: {
    organizationId: string
    applicationNumber: string
    email: string
    classification?: string | null
    programId?: string | null
    secondaryBackground?: SecondaryBackground | null
    academicStrand?: AcademicStrand | null
    requirementsChecklist?: string[] | null
    requirementsSubmitted?: boolean
  }) {
    const applicant = await this.findApplicantByReceipt(input)
    if (['admitted', 'rejected'].includes(applicant.status)) {
      throw badRequest('Admitted or rejected applications cannot be updated from the guest portal')
    }

    if (input.classification !== undefined && input.classification !== null) {
      if (!(GUEST_CLASSIFICATIONS as readonly string[]).includes(input.classification)) {
        throw badRequest('classification must be new, freshman, transferee, or returning')
      }
      if (
        !(STUDENT_CLASSIFICATIONS as readonly string[]).includes(input.classification)
      ) {
        throw badRequest('Invalid classification')
      }
      applicant.classification = input.classification
    }

    if (input.programId !== undefined) {
      if (input.programId) {
        const program = await Program.query()
          .where('organization_id', input.organizationId)
          .where('id', input.programId)
          .where('is_active', true)
          .first()
        if (!program) throw badRequest('Selected program is not available')
        applicant.programId = program.id
        await this.recordStatusChange({
          organizationId: input.organizationId,
          applicantId: applicant.id,
          fromStatus: applicant.status,
          toStatus: applicant.status,
          note: `Program selected: ${program.code}`,
        })
      } else {
        applicant.programId = null
      }
    }

    const formAnswers = { ...(applicant.formAnswers ?? {}) }
    if (input.secondaryBackground !== undefined) {
      if (input.secondaryBackground === null) {
        delete formAnswers.secondaryBackground
        delete formAnswers.academicStrand
      } else {
        const bg = normalizeSecondaryBackground(input.secondaryBackground)
        if (!bg) throw badRequest('Invalid secondaryBackground')
        formAnswers.secondaryBackground = bg
        if (bg !== 'shs_academic') {
          delete formAnswers.academicStrand
        }
      }
    }
    if (input.academicStrand !== undefined) {
      const bg =
        normalizeSecondaryBackground(formAnswers.secondaryBackground) ??
        normalizeSecondaryBackground(input.secondaryBackground)
      if (input.academicStrand === null || bg !== 'shs_academic') {
        delete formAnswers.academicStrand
      } else {
        const strand = normalizeAcademicStrand(input.academicStrand)
        if (!strand) throw badRequest('academicStrand must be ABM, STEM, HUMSS, or GAS')
        formAnswers.academicStrand = strand
      }
    }
    if (input.requirementsChecklist !== undefined) {
      formAnswers.requirementsChecklist = input.requirementsChecklist ?? []
    }
    if (input.requirementsSubmitted !== undefined) {
      formAnswers.requirementsSubmitted = input.requirementsSubmitted
      if (input.requirementsSubmitted) {
        const from = applicant.status
        if (!['admitted', 'rejected', 'under_review'].includes(applicant.status)) {
          applicant.status = 'under_review'
          await this.recordStatusChange({
            organizationId: input.organizationId,
            applicantId: applicant.id,
            fromStatus: from,
            toStatus: 'under_review',
            note: 'Guest portal: requirements checklist submitted',
          })
        }
      }
    }
    applicant.formAnswers = formAnswers
    await applicant.save()

    await auditLogService.log({
      organizationId: input.organizationId,
      action: AuditAction.UPDATE,
      entityType: 'applicant',
      entityId: applicant.id,
      metadata: { source: 'guest_journey' },
    })

    return this.lookupPortalStatus({
      organizationId: input.organizationId,
      applicationNumber: input.applicationNumber,
      email: input.email,
    })
  }

  async autoAssignOnlineEntranceExam(
    organizationId: string,
    applicantId: string,
    actorUserId?: string | null
  ) {
    const applicant = await Applicant.query()
      .where('organization_id', organizationId)
      .where('id', applicantId)
      .firstOrFail()

    const classification = applicant.classification
    if (classification && classification !== 'new' && classification !== 'freshman') {
      return null
    }

    const existing = await UsisAdmissionEventResult.query()
      .where('applicant_id', applicant.id)
      .preload('event')
    if (existing.some((r) => r.event?.eventType === 'entrance_exam')) return existing[0] ?? null

    const open = await this.listOpenOnlineEntranceExams(organizationId)
    const event = open[0]
    if (!event) return null

    return this.assignApplicant(
      organizationId,
      { eventId: event.id, applicantId: applicant.id },
      actorUserId
    )
  }

  async openGuestExam(input: {
    organizationId: string
    applicationNumber: string
    email: string
    eventId?: string | null
  }) {
    const applicant = await this.findApplicantByReceipt(input)
    if (['admitted', 'rejected'].includes(applicant.status)) {
      throw badRequest('This application is closed for examinations')
    }

    let assignment: UsisAdmissionEventResult | null = null
    if (input.eventId) {
      const existing = await UsisAdmissionEventResult.query()
        .where('organization_id', input.organizationId)
        .where('event_id', input.eventId)
        .where('applicant_id', applicant.id)
        .preload('event')
        .first()
      if (existing) {
        assignment = existing
      } else {
        assignment = await this.assignApplicant(input.organizationId, {
          eventId: input.eventId,
          applicantId: applicant.id,
        })
        await assignment.load('event')
      }
    } else {
      const pending = await UsisAdmissionEventResult.query()
        .where('organization_id', input.organizationId)
        .where('applicant_id', applicant.id)
        .whereIn('result', ['pending', 'fail'])
        .preload('event')
      assignment =
        pending.find(
          (r) =>
            r.event?.eventType === 'entrance_exam' &&
            isOnlineCapable(r.event.deliveryMode) &&
            (r.event.questionsJson?.length ?? 0) > 0
        ) ?? null
      if (!assignment) {
        const open = await this.listOpenOnlineEntranceExams(input.organizationId)
        if (!open[0]) throw badRequest('No online entrance exam is open right now')
        assignment = await this.assignApplicant(input.organizationId, {
          eventId: open[0].id,
          applicantId: applicant.id,
        })
        await assignment.load('event')
      }
    }

    const event = assignment.event
    if (!event || event.eventType !== 'entrance_exam') {
      throw badRequest('Assigned event is not an entrance examination')
    }
    if (!isOnlineCapable(event.deliveryMode)) {
      throw badRequest('This examination is onsite only. Please attend the scheduled venue.')
    }
    if ((event.questionsJson?.length ?? 0) === 0) {
      throw badRequest('Examination instrument is not published yet')
    }
    if (!examWindowOpen(event)) {
      throw badRequest('Examination window is closed')
    }
    if (assignment.result === 'pass' || assignment.result === 'waived') {
      throw badRequest('Entrance examination already passed')
    }

    if (assignment.result === 'fail' || !assignment.startedAt || assignment.submittedAt) {
      assignment.result = 'pending'
      assignment.startedAt = DateTime.now()
      assignment.submittedAt = null
      assignment.answersJson = null
      assignment.attemptCount = (assignment.attemptCount ?? 0) + 1
      await assignment.save()
    }

    const expiresAt =
      event.durationMinutes && assignment.startedAt
        ? assignment.startedAt.plus({ minutes: event.durationMinutes })
        : event.windowClosesAt

    return {
      applicant,
      event,
      assignment,
      questions: event.questionsJson.map(publicQuestion),
      durationMinutes: event.durationMinutes,
      passScore: event.passScore ?? DEFAULT_PASS_SCORE,
      startedAt: assignment.startedAt,
      expiresAt,
    }
  }

  async submitGuestExam(input: {
    organizationId: string
    applicationNumber: string
    email: string
    eventId: string
    answers: Record<string, number>
  }) {
    const session = await this.openGuestExam({
      organizationId: input.organizationId,
      applicationNumber: input.applicationNumber,
      email: input.email,
      eventId: input.eventId,
    })

    if (session.expiresAt && DateTime.now() > session.expiresAt) {
      throw badRequest('Examination time has expired')
    }

    const questions = session.event.questionsJson
    let correct = 0
    for (const q of questions) {
      if (Number(input.answers[q.id]) === q.correctIndex) correct += 1
    }
    const maxScore = questions.length
    const percent = maxScore === 0 ? 0 : Math.round((correct / maxScore) * 10000) / 100
    const passScore = session.event.passScore ?? DEFAULT_PASS_SCORE
    const result: AdmissionEventResultValue = percent >= passScore ? 'pass' : 'fail'
    const strandOutcome = scoreExamStrandSuggestion(questions, input.answers)

    const row = session.assignment
    row.answersJson = input.answers
    row.score = percent
    row.maxScore = maxScore
    row.percentScore = percent
    row.result = result
    row.remarks = [
      `Guest portal auto-score ${correct}/${maxScore} (${percent}%) · pass mark ${passScore}%`,
      strandOutcome.suggestedStrand
        ? `Suggested strand: ${strandOutcome.suggestedStrand}`
        : 'No strand-tagged items scored',
    ].join(' · ')
    row.submittedAt = DateTime.now()
    row.recordedAt = DateTime.now()
    row.recordedBy = null
    await row.save()

    const applicant = session.applicant
    const formAnswers = { ...(applicant.formAnswers ?? {}) }
    formAnswers.entranceExamOutcome = {
      eventId: session.event.id,
      eventTitle: session.event.title,
      result,
      percentScore: percent,
      correct,
      maxScore,
      passScore,
      suggestedStrand: strandOutcome.suggestedStrand,
      rankedStrands: strandOutcome.rankedStrands,
      strandScores: strandOutcome.strandScores,
      submittedAt: DateTime.now().toISO(),
    }
    applicant.formAnswers = formAnswers

    if (!['admitted', 'rejected'].includes(applicant.status)) {
      const from = applicant.status
      applicant.status = 'under_review'
      await this.recordStatusChange({
        organizationId: input.organizationId,
        applicantId: applicant.id,
        fromStatus: from,
        toStatus: 'under_review',
        note: strandOutcome.suggestedStrand
          ? `Entrance exam ${result}: ${percent}% · suggested ${strandOutcome.suggestedStrand}`
          : `Entrance exam ${result}: ${percent}%`,
      })
    }
    await applicant.save()

    await auditLogService.log({
      organizationId: input.organizationId,
      action: AuditAction.UPDATE,
      entityType: 'usis_admission_event_result',
      entityId: row.id,
      metadata: {
        source: 'guest_exam_submit',
        result,
        percent,
        correct,
        maxScore,
        suggestedStrand: strandOutcome.suggestedStrand,
      },
    })

    return {
      result,
      score: percent,
      percentScore: percent,
      maxScore,
      correct,
      passScore,
      remarks: row.remarks,
      suggestedStrand: strandOutcome.suggestedStrand,
      rankedStrands: strandOutcome.rankedStrands,
      strandScores: strandOutcome.strandScores,
      nextAction: result === 'pass' ? 'program' : 'exam',
    }
  }
}

export const admissionEventsService = new AdmissionEventsService()
