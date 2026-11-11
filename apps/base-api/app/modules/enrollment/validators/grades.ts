import vine from '@vinejs/vine'
import { GRADE_CORRECTION_REASON_CODES } from '#modules/enrollment/domain/grades'

export const gradingSchemeValidator = vine.compile(
  vine.object({
    code: vine.string().maxLength(64),
    name: vine.string().maxLength(255),
    failingMark: vine.number().min(0).max(5).optional(),
    incConversionDays: vine.number().min(1).max(3650).optional(),
    isDefault: vine.boolean().optional(),
    marks: vine
      .array(
        vine.object({
          code: vine.string(),
          label: vine.string(),
          numericEquivalent: vine.number().nullable().optional(),
          remark: vine.string(),
          isIncomplete: vine.boolean().optional(),
          isDropped: vine.boolean().optional(),
          isNoGrade: vine.boolean().optional(),
          countsInGwa: vine.boolean().optional(),
          isPassing: vine.boolean().optional(),
        })
      )
      .optional(),
  })
)

export const gradeDeadlineValidator = vine.compile(
  vine.object({
    academicYearId: vine.string().uuid(),
    semester: vine.number().min(1).max(3),
    encodeOpensAt: vine.string().optional(),
    encodeClosesAt: vine.string().optional(),
    submitDeadlineAt: vine.string().optional(),
  })
)

export const facultyAssignValidator = vine.compile(
  vine.object({
    sectionId: vine.string().uuid(),
    facultyUserId: vine.string().uuid().optional(),
    facultyEmail: vine.string().email().optional(),
    academicYearId: vine.string().uuid(),
    semester: vine.number().min(1).max(3),
  })
)

export const openClassRecordValidator = vine.compile(
  vine.object({
    sectionId: vine.string().uuid(),
    academicYearId: vine.string().uuid(),
    semester: vine.number().min(1).max(3),
  })
)

export const enlistClassStudentValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().minLength(3).maxLength(64),
  })
)

export const encodeGradesValidator = vine.compile(
  vine.object({
    classRecordId: vine.string().uuid(),
    grades: vine
      .array(
        vine.object({
          studentId: vine.string().uuid(),
          markCode: vine.string().maxLength(32),
          rawScore: vine.number().optional(),
        })
      )
      .minLength(1),
  })
)

export const submitClassGradesValidator = vine.compile(
  vine.object({
    classRecordId: vine.string().uuid(),
    signatories: vine
      .array(
        vine.object({
          role: vine.string(),
          name: vine.string(),
        })
      )
      .optional(),
  })
)

export const correctionRequestValidator = vine.compile(
  vine.object({
    gradeEntryId: vine.string().uuid(),
    reasonCode: vine.enum(GRADE_CORRECTION_REASON_CODES),
    reasonNotes: vine.string().optional(),
    supportingDocumentRefs: vine.array(vine.string()).minLength(1),
    proposedMarkCode: vine.string().maxLength(32),
    requiredLevels: vine.number().min(1).max(5).optional(),
  })
)

export const correctionDecideValidator = vine.compile(
  vine.object({
    approve: vine.boolean(),
    notes: vine.string().optional(),
    actorLevel: vine.number().min(1).max(5).optional(),
  })
)

export const attendanceValidator = vine.compile(
  vine.object({
    classRecordId: vine.string().uuid(),
    studentId: vine.string().uuid(),
    sessionDate: vine.string(),
    status: vine.string().in(['present', 'absent', 'late', 'excused']),
    notes: vine.string().optional(),
  })
)
