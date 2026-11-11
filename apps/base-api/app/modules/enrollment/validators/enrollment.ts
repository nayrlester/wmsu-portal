import vine from '@vinejs/vine'

export const createApplicantValidator = vine.compile(
  vine.object({
    applicationNumber: vine.string().minLength(1).maxLength(64),
    firstName: vine.string().minLength(1).maxLength(128),
    middleName: vine.string().maxLength(128).optional(),
    lastName: vine.string().minLength(1).maxLength(128),
    email: vine.string().email(),
    mobile: vine.string().maxLength(32).optional(),
    birthDate: vine.string().optional(),
    programId: vine.string().uuid().optional(),
    classification: vine.string().trim().maxLength(40).optional(),
    mdmCampusId: vine.string().uuid().optional(),
  })
)

export const updateApplicantValidator = vine.compile(
  vine.object({
    firstName: vine.string().minLength(1).maxLength(128).optional(),
    middleName: vine.string().maxLength(128).nullable().optional(),
    lastName: vine.string().minLength(1).maxLength(128).optional(),
    email: vine.string().email().optional(),
    mobile: vine.string().maxLength(32).nullable().optional(),
    birthDate: vine.string().nullable().optional(),
    programId: vine.string().uuid().nullable().optional(),
    classification: vine.string().trim().maxLength(40).nullable().optional(),
    mdmCampusId: vine.string().uuid().nullable().optional(),
    status: vine
      .string()
      .in(['pending', 'scheduled', 'under_review', 'admitted', 'rejected'])
      .optional(),
  })
)

export const admitApplicantValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().minLength(1).maxLength(64),
  })
)

export const createProgramValidator = vine.compile(
  vine.object({
    code: vine.string().minLength(1).maxLength(32),
    name: vine.string().minLength(2).maxLength(255),
    degreeLevel: vine.string().maxLength(64).optional(),
    years: vine.number().min(1).optional(),
  })
)

export const createAcademicYearValidator = vine.compile(
  vine.object({
    code: vine.string().minLength(1).maxLength(32),
    name: vine.string().minLength(2).maxLength(255),
    startDate: vine.string(),
    endDate: vine.string(),
  })
)

export const updateAcademicYearValidator = vine.compile(
  vine.object({
    code: vine.string().minLength(1).maxLength(32).optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    startDate: vine.string().optional(),
    endDate: vine.string().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const updateProgramValidator = vine.compile(
  vine.object({
    code: vine.string().minLength(1).maxLength(32).optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    degreeLevel: vine.string().maxLength(64).nullable().optional(),
    years: vine.number().min(1).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const createSectionValidator = vine.compile(
  vine.object({
    academicYearId: vine.string().uuid(),
    programId: vine.string().uuid(),
    code: vine.string().minLength(1).maxLength(32),
    name: vine.string().minLength(2).maxLength(255),
    yearLevel: vine.number().min(1),
    semester: vine.number().min(1).max(3),
    capacity: vine.number().min(1).optional(),
    subjectId: vine.string().uuid().nullable().optional(),
    isBlockSection: vine.boolean().optional(),
    blockGroupCode: vine.string().trim().maxLength(64).nullable().optional(),
  })
)

export const updateSectionValidator = vine.compile(
  vine.object({
    code: vine.string().minLength(1).maxLength(32).optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    yearLevel: vine.number().min(1).optional(),
    semester: vine.number().min(1).max(3).optional(),
    capacity: vine.number().min(0).nullable().optional(),
    waitlistEnabled: vine.boolean().optional(),
    isBlockSection: vine.boolean().optional(),
    blockGroupCode: vine.string().trim().maxLength(64).nullable().optional(),
    subjectId: vine.string().uuid().nullable().optional(),
    status: vine.enum(['draft', 'open', 'active', 'closed', 'dissolved'] as const).optional(),
  })
)

export const replicateSchedulesValidator = vine.compile(
  vine.object({
    sourceAcademicYearId: vine.string().uuid(),
    targetAcademicYearId: vine.string().uuid(),
    semester: vine.number().min(1).max(3),
  })
)

export const createEnrollmentValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    academicYearId: vine.string().uuid(),
    sectionId: vine.string().uuid().optional(),
    yearLevel: vine.number().min(1),
    semester: vine.number().min(1).max(3),
  })
)

export const advisingApproveValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
  })
)

export const assessEnrollmentValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    feeScheduleId: vine.string().uuid().optional(),
    tuitionFee: vine.number().min(0).optional(),
    miscFees: vine.number().min(0).optional(),
    discount: vine.number().min(0).optional(),
  })
)

export const submitGradesValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    grades: vine
      .array(
        vine.object({
          courseCode: vine.string().maxLength(32),
          courseTitle: vine.string().maxLength(255),
          units: vine.number().min(0),
          grade: vine.number().min(0).max(100),
          remarks: vine.string().maxLength(32).optional(),
        })
      )
      .minLength(1),
  })
)

export const recordPaymentValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    enrollmentId: vine.string().uuid().optional(),
    amount: vine.number().positive(),
    paymentType: vine.string().in(['cash', 'check', 'online', 'card']).optional(),
    reference: vine.string().optional(),
    orNumber: vine.string().maxLength(64).optional(),
  })
)

export const exportGradesValidator = vine.compile(
  vine.object({
    academicYearId: vine.string().uuid().optional(),
    semester: vine.number().min(1).max(3).optional(),
  })
)
