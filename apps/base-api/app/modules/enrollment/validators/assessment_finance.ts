import vine from '@vinejs/vine'

export const feeScheduleValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(2).maxLength(64),
    name: vine.string().trim().minLength(2).maxLength(255),
    academicYearId: vine.string().uuid().optional(),
    semester: vine.number().min(1).max(3).optional(),
    classification: vine.string().trim().maxLength(40).optional(),
    approvedByRole: vine.string().trim().maxLength(80).optional(),
    lines: vine.array(
      vine.object({
        feeCode: vine.string().trim().minLength(1).maxLength(64),
        description: vine.string().trim().minLength(1).maxLength(255),
        feeType: vine.enum([
          'tuition',
          'miscellaneous',
          'laboratory',
          'other',
        ] as const),
        calculationMethod: vine.enum(['fixed', 'per_unit', 'per_subject'] as const),
        amount: vine.number().min(0),
        subjectCode: vine.string().trim().maxLength(32).optional(),
        priority: vine.number().optional(),
      })
    ).minLength(1),
  })
)

export const prepareAssessmentValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    feeScheduleId: vine.string().uuid().optional(),
    tuitionFee: vine.number().min(0).optional(),
    miscFees: vine.number().min(0).optional(),
    discount: vine.number().min(0).optional(),
    submitToUfms: vine.boolean().optional(),
  })
)

export const aidTagValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    enrollmentId: vine.string().uuid().optional(),
    tagType: vine.enum(['scholarship', 'discount', 'voucher', 'subsidy', 'unifast'] as const),
    code: vine.string().trim().minLength(1).maxLength(64),
    name: vine.string().trim().minLength(1).maxLength(255),
    calculationMethod: vine.enum(['fixed', 'percent'] as const),
    value: vine.number().min(0),
    notes: vine.string().trim().optional(),
  })
)

export const issueDocumentValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    docType: vine.enum(['assessment_form', 'certificate_of_registration'] as const),
  })
)
