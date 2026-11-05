import vine from '@vinejs/vine'

export const listAlumniValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().optional(),
    q: vine.string().trim().optional(),
    collegeCode: vine.string().trim().optional(),
    programCode: vine.string().trim().optional(),
    graduationYear: vine.number().withoutDecimals().optional(),
    location: vine.string().trim().optional(),
    limit: vine.number().withoutDecimals().min(1).max(200).optional(),
    offset: vine.number().withoutDecimals().min(0).optional(),
  })
)

export const updateAlumniValidator = vine.compile(
  vine.object({
    email: vine.string().email().optional().nullable(),
    mobile: vine.string().trim().maxLength(64).optional().nullable(),
    employmentInfo: vine.string().trim().maxLength(4000).optional().nullable(),
    location: vine.string().trim().maxLength(255).optional().nullable(),
    consentProfileUpdate: vine.boolean().optional(),
    consentTracer: vine.boolean().optional(),
    visibilityPrefs: vine.object({}).allowUnknownProperties().optional().nullable(),
  })
)

export const dashboardSummaryValidator = vine.compile(
  vine.object({
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    locality: vine.enum(['local', 'foreign'] as const).optional(),
  })
)

export const requestReportValidator = vine.compile(
  vine.object({
    kind: vine.enum(['transcript', 'certification'] as const),
    status: vine.string().trim().optional(),
    locality: vine.enum(['local', 'foreign'] as const).optional(),
    certificationType: vine.string().trim().optional(),
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    limit: vine.number().withoutDecimals().min(1).max(500).optional(),
    offset: vine.number().withoutDecimals().min(0).optional(),
    format: vine.enum(['json', 'csv'] as const).optional(),
  })
)

export const issuanceReportValidator = vine.compile(
  vine.object({
    kind: vine.enum(['transcript', 'certification'] as const),
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    limit: vine.number().withoutDecimals().min(1).max(500).optional(),
    offset: vine.number().withoutDecimals().min(0).optional(),
    format: vine.enum(['json', 'csv'] as const).optional(),
  })
)
