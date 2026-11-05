import vine from '@vinejs/vine'

export const createChartAccountValidator = vine.compile(
  vine.object({
    accountCode: vine.string().trim().minLength(1).maxLength(64),
    accountTitle: vine.string().trim().minLength(1).maxLength(255),
    accountType: vine.string().trim().minLength(1).maxLength(32),
    parentId: vine.string().uuid().optional().nullable(),
    uacsCode: vine.string().trim().maxLength(64).optional().nullable(),
    description: vine.string().trim().optional().nullable(),
    contraAccountId: vine.string().uuid().optional().nullable(),
    subsidiaryTag: vine.string().trim().maxLength(64).optional().nullable(),
    sortOrder: vine.number().withoutDecimals().optional(),
    isPostable: vine.boolean().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const createFundValidator = vine.compile(
  vine.object({
    fundCode: vine.string().trim().minLength(1).maxLength(64),
    fundName: vine.string().trim().minLength(1).maxLength(255),
    fundType: vine.string().trim().maxLength(32).optional().nullable(),
    openingBalance: vine.number().decimal([0, 2]).optional(),
    description: vine.string().trim().optional().nullable(),
    isActive: vine.boolean().optional(),
  })
)

export const createBankValidator = vine.compile(
  vine.object({
    bankCode: vine.string().trim().minLength(1).maxLength(64),
    bankName: vine.string().trim().minLength(1).maxLength(255),
    isActive: vine.boolean().optional(),
  })
)

export const createBankAccountValidator = vine.compile(
  vine.object({
    bankId: vine.string().uuid(),
    fundId: vine.string().uuid().optional().nullable(),
    accountNumber: vine.string().trim().minLength(1).maxLength(64),
    accountName: vine.string().trim().minLength(1).maxLength(255),
    currencyCode: vine.string().trim().maxLength(8).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const createFiscalPeriodValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(32),
    name: vine.string().trim().minLength(1).maxLength(128),
    startsOn: vine.date({ formats: ['YYYY-MM-DD', 'iso8601'] }),
    endsOn: vine.date({ formats: ['YYYY-MM-DD', 'iso8601'] }),
    status: vine.string().trim().maxLength(32).optional(),
  })
)

export const createOrSeriesValidator = vine.compile(
  vine.object({
    seriesCode: vine.string().trim().minLength(1).maxLength(32),
    prefix: vine.string().trim().minLength(1).maxLength(32),
    nextNumber: vine.number().withoutDecimals().min(1).optional(),
    padding: vine.number().withoutDecimals().min(1).max(12).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const createApprovalWorkflowValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(64),
    name: vine.string().trim().minLength(1).maxLength(255),
    entityType: vine.string().trim().minLength(1).maxLength(64),
    isActive: vine.boolean().optional(),
    steps: vine
      .array(
        vine.object({
          stepOrder: vine.number().withoutDecimals().min(1),
          name: vine.string().trim().minLength(1).maxLength(128),
          requiredPermission: vine.string().trim().maxLength(128).optional().nullable(),
        })
      )
      .optional(),
  })
)
