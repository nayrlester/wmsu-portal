import vine from '@vinejs/vine'

export const upsertTormsSettingValidator = vine.compile(
  vine.object({
    settingKey: vine.string().trim().minLength(2).maxLength(128),
    settingValue: vine.record(vine.any()),
    description: vine.string().trim().maxLength(1000).optional(),
  })
)

export const listTormsOutboxValidator = vine.compile(
  vine.object({
    status: vine.string().trim().optional(),
    contractCode: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)

export const syncPullValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().minLength(1).maxLength(64),
  })
)

export const gradesSyncValidator = vine.compile(
  vine.object({
    organizationId: vine.string().uuid(),
    studentNumber: vine.string().trim().minLength(1).maxLength(64),
    grades: vine.array(
      vine.object({
        academicYear: vine.string().trim().minLength(1).maxLength(32),
        semester: vine.number(),
        courseCode: vine.string().trim().minLength(1).maxLength(32),
        courseTitle: vine.string().trim().minLength(1).maxLength(255),
        units: vine.number(),
        grade: vine.number().nullable().optional(),
        remarks: vine.string().trim().maxLength(32).nullable().optional(),
        sourceEntryId: vine.string().trim().maxLength(128).nullable().optional(),
        originalGrade: vine.number().nullable().optional(),
        modifiedGrade: vine.number().nullable().optional(),
        programCode: vine.string().trim().maxLength(32).nullable().optional(),
      })
    ),
  })
)

export const integrationProbeValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().minLength(1).maxLength(64).optional(),
    paymentRef: vine.string().trim().maxLength(128).optional(),
    documentId: vine.string().trim().maxLength(128).optional(),
    organizationId: vine.string().uuid().optional(),
  })
)
