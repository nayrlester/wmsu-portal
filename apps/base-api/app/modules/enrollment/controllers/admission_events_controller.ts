import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { admissionEventsService } from '#modules/enrollment/services/admission_events_service'
import type {
  AdmissionDeliveryMode,
  AdmissionExamQuestion,
} from '#modules/enrollment/models/usis_admission_event'

const examQuestionSchema = vine.object({
  id: vine.string().trim().minLength(1).maxLength(64),
  prompt: vine.string().trim().minLength(2).maxLength(1000),
  choices: vine.array(vine.string().trim().minLength(1).maxLength(500)).minLength(2),
  correctIndex: vine.number().min(0),
  strandTag: vine.enum(['ABM', 'STEM', 'HUMSS', 'GAS', 'general'] as const).optional(),
})

const createEventValidator = vine.compile(
  vine.object({
    eventType: vine.enum(['entrance_exam', 'interview', 'assessment'] as const),
    title: vine.string().trim().minLength(2).maxLength(255),
    scheduledAt: vine.string().trim(),
    location: vine.string().trim().maxLength(255).optional(),
    capacity: vine.number().min(1).optional(),
    notes: vine.string().trim().optional(),
    isActive: vine.boolean().optional(),
    deliveryMode: vine.enum(['onsite', 'online', 'hybrid'] as const).optional(),
    passScore: vine.number().min(0).max(100).optional(),
    durationMinutes: vine.number().min(5).max(480).optional(),
    windowOpensAt: vine.string().trim().optional(),
    windowClosesAt: vine.string().trim().optional(),
    questions: vine.array(examQuestionSchema).optional(),
  })
)

const updateEventValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(2).maxLength(255).optional(),
    scheduledAt: vine.string().trim().optional(),
    location: vine.string().trim().maxLength(255).nullable().optional(),
    capacity: vine.number().min(1).nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
    isActive: vine.boolean().optional(),
    deliveryMode: vine.enum(['onsite', 'online', 'hybrid'] as const).optional(),
    passScore: vine.number().min(0).max(100).nullable().optional(),
    durationMinutes: vine.number().min(5).max(480).nullable().optional(),
    windowOpensAt: vine.string().trim().nullable().optional(),
    windowClosesAt: vine.string().trim().nullable().optional(),
    questions: vine.array(examQuestionSchema).nullable().optional(),
  })
)

const assignValidator = vine.compile(
  vine.object({
    eventId: vine.string().uuid(),
    applicantId: vine.string().uuid(),
  })
)

const resultValidator = vine.compile(
  vine.object({
    eventId: vine.string().uuid(),
    applicantId: vine.string().uuid(),
    score: vine.number().optional(),
    result: vine.enum(['pending', 'pass', 'fail', 'waived'] as const),
    remarks: vine.string().trim().optional(),
  })
)

const portalStatusValidator = vine.compile(
  vine.object({
    orgCode: vine.string().trim().maxLength(32).optional(),
    applicationNumber: vine.string().trim().minLength(3).maxLength(64),
    email: vine.string().email(),
  })
)

const guestExamOpenValidator = vine.compile(
  vine.object({
    orgCode: vine.string().trim().maxLength(32).optional(),
    applicationNumber: vine.string().trim().minLength(3).maxLength(64),
    email: vine.string().email(),
    eventId: vine.string().uuid().optional(),
  })
)

const guestExamSubmitValidator = vine.compile(
  vine.object({
    orgCode: vine.string().trim().maxLength(32).optional(),
    applicationNumber: vine.string().trim().minLength(3).maxLength(64),
    email: vine.string().email(),
    eventId: vine.string().uuid(),
    answers: vine.record(vine.number()),
  })
)

const guestJourneyValidator = vine.compile(
  vine.object({
    orgCode: vine.string().trim().maxLength(32).optional(),
    applicationNumber: vine.string().trim().minLength(3).maxLength(64),
    email: vine.string().email(),
    classification: vine
      .enum(['new', 'freshman', 'transferee', 'returning'] as const)
      .optional(),
    programId: vine.string().uuid().nullable().optional(),
    secondaryBackground: vine
      .enum(['shs_academic', 'shs_other', 'not_shs', 'undecided'] as const)
      .nullable()
      .optional(),
    academicStrand: vine.enum(['ABM', 'STEM', 'HUMSS', 'GAS'] as const).nullable().optional(),
    requirementsChecklist: vine.array(vine.string().trim().maxLength(255)).optional(),
    requirementsSubmitted: vine.boolean().optional(),
  })
)

function serializeEvent(row: {
  id: string
  eventType: string
  title: string
  scheduledAt: { toISO(): string | null }
  location: string | null
  capacity: number | null
  notes: string | null
  isActive: boolean
  deliveryMode?: AdmissionDeliveryMode | string
  passScore?: number | null
  durationMinutes?: number | null
  windowOpensAt?: { toISO(): string | null } | null
  windowClosesAt?: { toISO(): string | null } | null
  questionsJson?: AdmissionExamQuestion[]
}) {
  return {
    id: row.id,
    eventType: row.eventType,
    title: row.title,
    scheduledAt: row.scheduledAt.toISO(),
    location: row.location,
    capacity: row.capacity,
    notes: row.notes,
    isActive: row.isActive,
    deliveryMode: row.deliveryMode ?? 'onsite',
    passScore: row.passScore ?? null,
    durationMinutes: row.durationMinutes ?? null,
    windowOpensAt: row.windowOpensAt?.toISO() ?? null,
    windowClosesAt: row.windowClosesAt?.toISO() ?? null,
    questionCount: row.questionsJson?.length ?? 0,
    questions: row.questionsJson ?? [],
  }
}

function serializePortal(payload: Awaited<ReturnType<typeof admissionEventsService.lookupPortalStatus>>) {
  const {
    applicant,
    history,
    results,
    openOnlineExams,
    program,
    journey,
    secondaryBackground,
    academicStrand,
    entranceExamOutcome,
    programGuidance,
  } = payload
  return {
    applicationNumber: applicant.applicationNumber,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    email: applicant.email,
    status: applicant.status,
    classification: applicant.classification,
    secondaryBackground,
    academicStrand,
    entranceExamOutcome,
    programGuidance,
    programId: applicant.programId,
    program: program
      ? { id: program.id, code: program.code, name: program.name }
      : null,
    appliedAt: applicant.appliedAt?.toISO() ?? null,
    admittedAt: applicant.admittedAt?.toISO() ?? null,
    statusHistory: history.map((r) => ({
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      note: r.note,
      createdAt: r.createdAt.toISO(),
    })),
    events: results.map((r) => ({
      eventId: r.eventId,
      eventType: r.event?.eventType ?? null,
      title: r.event?.title ?? null,
      scheduledAt: r.event?.scheduledAt?.toISO() ?? null,
      location: r.event?.location ?? null,
      deliveryMode: r.event?.deliveryMode ?? 'onsite',
      result: r.result,
      score: r.score,
      percentScore: r.percentScore,
      submittedAt: r.submittedAt?.toISO() ?? null,
      canTakeOnline:
        r.result !== 'pass' &&
        r.result !== 'waived' &&
        (r.event?.deliveryMode === 'online' || r.event?.deliveryMode === 'hybrid') &&
        (r.event?.questionsJson?.length ?? 0) > 0,
    })),
    openOnlineExams: openOnlineExams.map((e) => ({
      id: e.id,
      title: e.title,
      scheduledAt: e.scheduledAt.toISO(),
      durationMinutes: e.durationMinutes,
      passScore: e.passScore,
      questionCount: e.questionsJson?.length ?? 0,
    })),
    journey,
  }
}

export default class AdmissionEventsController {
  async listEvents(ctx: HttpContext) {
    const rows = await admissionEventsService.listEvents(
      ctx.auth.user!.organizationId,
      ctx.request.input('eventType') || undefined
    )
    return ctx.response.ok({ data: rows.map(serializeEvent) })
  }

  async createEvent(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(createEventValidator)
    const row = await admissionEventsService.createEvent(user.organizationId, body, user.id)
    return ctx.response.created({ data: serializeEvent(row) })
  }

  async updateEvent(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(updateEventValidator)
    const row = await admissionEventsService.updateEvent(
      user.organizationId,
      ctx.params.id,
      body,
      user.id
    )
    return ctx.response.ok({ data: serializeEvent(row) })
  }

  async assign(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(assignValidator)
    const row = await admissionEventsService.assignApplicant(user.organizationId, body, user.id)
    return ctx.response.created({
      data: {
        id: row.id,
        eventId: row.eventId,
        applicantId: row.applicantId,
        result: row.result,
        score: row.score,
      },
    })
  }

  async recordResult(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(resultValidator)
    const row = await admissionEventsService.recordResult(user.organizationId, body, user.id)
    return ctx.response.ok({
      data: {
        id: row.id,
        eventId: row.eventId,
        applicantId: row.applicantId,
        result: row.result,
        score: row.score,
        remarks: row.remarks,
        recordedAt: row.recordedAt?.toISO() ?? null,
      },
    })
  }

  async listEventResults(ctx: HttpContext) {
    const rows = await admissionEventsService.listEventResults(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        applicantId: r.applicantId,
        applicantName: r.applicant
          ? `${r.applicant.lastName}, ${r.applicant.firstName}`
          : null,
        result: r.result,
        score: r.score,
        remarks: r.remarks,
        recordedAt: r.recordedAt?.toISO() ?? null,
      })),
    })
  }

  async listApplicantResults(ctx: HttpContext) {
    const rows = await admissionEventsService.listApplicantResults(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        eventType: r.event?.eventType ?? null,
        eventTitle: r.event?.title ?? null,
        scheduledAt: r.event?.scheduledAt?.toISO() ?? null,
        result: r.result,
        score: r.score,
        remarks: r.remarks,
      })),
    })
  }

  async listStatusHistory(ctx: HttpContext) {
    const rows = await admissionEventsService.listStatusHistory(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        note: r.note,
        createdAt: r.createdAt.toISO(),
      })),
    })
  }

  async portalStatus(ctx: HttpContext) {
    const body = await ctx.request.validateUsing(portalStatusValidator)
    const { admissionFormService } = await import(
      '#modules/enrollment/services/admission_form_service'
    )
    const organizationId = await admissionFormService.resolveOrganizationId(body.orgCode)
    const payload = await admissionEventsService.lookupPortalStatus({
      organizationId,
      applicationNumber: body.applicationNumber,
      email: body.email,
    })
    return ctx.response.ok({ data: serializePortal(payload) })
  }

  async publicPrograms(ctx: HttpContext) {
    const { admissionFormService } = await import(
      '#modules/enrollment/services/admission_form_service'
    )
    const organizationId = await admissionFormService.resolveOrganizationId(
      ctx.request.input('orgCode')
    )
    const rows = await admissionEventsService.listPublicPrograms(organizationId)
    return ctx.response.ok({
      data: rows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        degreeLevel: p.degreeLevel,
        years: p.years,
      })),
    })
  }

  async guestJourneyUpdate(ctx: HttpContext) {
    const body = await ctx.request.validateUsing(guestJourneyValidator)
    const { admissionFormService } = await import(
      '#modules/enrollment/services/admission_form_service'
    )
    const organizationId = await admissionFormService.resolveOrganizationId(body.orgCode)
    const payload = await admissionEventsService.updateGuestJourney({
      organizationId,
      applicationNumber: body.applicationNumber,
      email: body.email,
      classification: body.classification,
      programId: body.programId,
      secondaryBackground: body.secondaryBackground,
      academicStrand: body.academicStrand,
      requirementsChecklist: body.requirementsChecklist,
      requirementsSubmitted: body.requirementsSubmitted,
    })
    return ctx.response.ok({ data: serializePortal(payload) })
  }

  async guestExamOpen(ctx: HttpContext) {
    const body = await ctx.request.validateUsing(guestExamOpenValidator)
    const { admissionFormService } = await import(
      '#modules/enrollment/services/admission_form_service'
    )
    const organizationId = await admissionFormService.resolveOrganizationId(body.orgCode)
    const session = await admissionEventsService.openGuestExam({
      organizationId,
      applicationNumber: body.applicationNumber,
      email: body.email,
      eventId: body.eventId,
    })
    return ctx.response.ok({
      data: {
        eventId: session.event.id,
        title: session.event.title,
        durationMinutes: session.durationMinutes,
        passScore: session.passScore,
        startedAt: session.startedAt?.toISO() ?? null,
        expiresAt: session.expiresAt?.toISO() ?? null,
        questionCount: session.questions.length,
        questions: session.questions,
        applicant: {
          applicationNumber: session.applicant.applicationNumber,
          firstName: session.applicant.firstName,
          lastName: session.applicant.lastName,
        },
      },
    })
  }

  async guestExamSubmit(ctx: HttpContext) {
    const body = await ctx.request.validateUsing(guestExamSubmitValidator)
    const { admissionFormService } = await import(
      '#modules/enrollment/services/admission_form_service'
    )
    const organizationId = await admissionFormService.resolveOrganizationId(body.orgCode)
    const result = await admissionEventsService.submitGuestExam({
      organizationId,
      applicationNumber: body.applicationNumber,
      email: body.email,
      eventId: body.eventId,
      answers: body.answers,
    })
    return ctx.response.ok({ data: result })
  }
}
