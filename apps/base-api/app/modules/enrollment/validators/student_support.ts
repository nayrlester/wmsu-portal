import vine from '@vinejs/vine'
import { SSS_OFFICES } from '#modules/enrollment/domain/student_support'

export const officeStaffValidator = vine.compile(
  vine.object({
    userId: vine.string().uuid(),
    office: vine.enum(SSS_OFFICES),
    roleTitle: vine.string().optional(),
  })
)

export const serviceRequestValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    office: vine.enum(SSS_OFFICES),
    requestType: vine.string(),
    channel: vine.string().optional(),
    summary: vine.string().optional(),
  })
)

export const counselingRequestValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    channel: vine.enum(['online', 'walk_in'] as const),
  })
)

export const caseNoteValidator = vine.compile(
  vine.object({
    counselingRequestId: vine.string().uuid(),
    sessionId: vine.string().uuid().optional(),
    studentId: vine.string().uuid(),
    noteBody: vine.string().minLength(1),
    noteKind: vine.string().optional(),
  })
)

export const healthEncounterValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    encounterType: vine.string().optional(),
    isEmergency: vine.boolean().optional(),
    clinicalNote: vine.string().optional(),
  })
)

export const healthClearanceValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    status: vine.enum(['pending', 'cleared', 'denied'] as const),
    clearanceType: vine.string().optional(),
    assessmentContext: vine.string().optional(),
    validUntil: vine.string().optional(),
  })
)

export const disciplineComplaintValidator = vine.compile(
  vine.object({
    respondentStudentId: vine.string().uuid(),
    complainantRole: vine.string().optional(),
    summary: vine.string().optional(),
  })
)

export const scholarshipProgramValidator = vine.compile(
  vine.object({
    code: vine.string(),
    name: vine.string(),
    sourceType: vine.enum(['internal', 'external'] as const),
    eligibilityConfig: vine.any().optional(),
    coverageConfig: vine.any().optional(),
  })
)

export const scholarshipApplyValidator = vine.compile(
  vine.object({
    programId: vine.string().uuid(),
    studentId: vine.string().uuid(),
    incomeClassification: vine.string().optional(),
    requirementsJson: vine.any().optional(),
  })
)

export const scholarshipDecideValidator = vine.compile(
  vine.object({
    approve: vine.boolean(),
    awardAmount: vine.number().optional(),
    enrollmentId: vine.string().uuid().optional(),
  })
)

export const queueTicketValidator = vine.compile(
  vine.object({
    office: vine.enum(SSS_OFFICES),
    serviceCode: vine.string(),
    studentId: vine.string().uuid().optional(),
  })
)
