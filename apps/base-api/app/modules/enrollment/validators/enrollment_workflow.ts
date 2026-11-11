import vine from '@vinejs/vine'
import { STUDENT_CLASSIFICATIONS, OVERRIDE_TYPES } from '#modules/enrollment/domain/enrollment_workflow'

export const createEnrollmentWorkflowValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    academicYearId: vine.string().uuid(),
    sectionId: vine.string().uuid().optional(),
    yearLevel: vine.number().min(1),
    semester: vine.number().min(1).max(3),
    classification: vine.enum(STUDENT_CLASSIFICATIONS),
    isRegularBlock: vine.boolean().optional(),
  })
)

export const startAdvisingSessionValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    mode: vine.enum(['online', 'face_to_face'] as const),
    onBehalf: vine.boolean().optional(),
  })
)

export const addRecommendationValidator = vine.compile(
  vine.object({
    subjectCode: vine.string().trim().minLength(1).maxLength(32),
    subjectTitle: vine.string().trim().maxLength(255).optional(),
    subjectId: vine.string().uuid().optional(),
    units: vine.number().min(0).optional(),
    sectionId: vine.string().uuid().optional(),
    action: vine.enum(['recommend', 'substitute', 'remove'] as const).optional(),
    substitutesForSubjectId: vine.string().uuid().optional(),
    notes: vine.string().trim().optional(),
  })
)

export const endorseAdvisingValidator = vine.compile(
  vine.object({
    remarks: vine.string().trim().optional(),
    overloadApproved: vine.boolean().optional(),
    underloadApproved: vine.boolean().optional(),
  })
)

export const advisingWaiverValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().trim().minLength(1).maxLength(128).optional(),
    enrollmentRef: vine.string().trim().minLength(1).maxLength(128).optional(),
    authorityRole: vine.string().trim().minLength(2).maxLength(80),
    reason: vine.string().trim().optional(),
    effectiveTo: vine.string().optional(),
  })
)

export const adviserAssignmentValidator = vine.compile(
  vine.object({
    adviserUserId: vine.string().uuid(),
    programId: vine.string().uuid().optional(),
    yearLevel: vine.number().min(1).optional(),
    sectionId: vine.string().uuid().optional(),
    studentId: vine.string().uuid().optional(),
    delegateUserId: vine.string().uuid().optional(),
  })
)

export const advisingPeriodValidator = vine.compile(
  vine.object({
    academicYearId: vine.string().uuid(),
    semester: vine.number().min(1).max(3),
    startsAt: vine.string(),
    endsAt: vine.string(),
    enforceCutoff: vine.boolean().optional(),
  })
)

export const enrollmentOverrideValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    overrideType: vine.enum(OVERRIDE_TYPES),
    reason: vine.string().trim().minLength(3),
  })
)

export const enrollmentChangeRequestValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    changeType: vine.enum(['add', 'drop', 'change'] as const),
    enrollmentLineId: vine.string().uuid().optional(),
    subjectId: vine.string().uuid().optional(),
    subjectCode: vine.string().trim().maxLength(32).optional(),
    subjectTitle: vine.string().trim().maxLength(255).optional(),
    units: vine.number().min(0).optional(),
    fromSectionId: vine.string().uuid().optional(),
    toSectionId: vine.string().uuid().optional(),
  })
)

export const decideChangeValidator = vine.compile(
  vine.object({
    approve: vine.boolean(),
    notes: vine.string().trim().optional(),
  })
)

export const rejectEnrollmentValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(3).maxLength(500),
  })
)

export const changeWindowValidator = vine.compile(
  vine.object({
    academicYearId: vine.string().uuid(),
    semester: vine.number().min(1).max(3),
    changeType: vine.enum(['add', 'drop', 'change'] as const),
    startsAt: vine.string(),
    endsAt: vine.string(),
  })
)

export const unitLoadPolicyValidator = vine.compile(
  vine.object({
    programId: vine.string().uuid().optional(),
    yearLevel: vine.number().min(1).optional(),
    minUnits: vine.number().min(0),
    maxUnits: vine.number().min(0),
    overloadMaxUnits: vine.number().min(0).optional(),
  })
)
