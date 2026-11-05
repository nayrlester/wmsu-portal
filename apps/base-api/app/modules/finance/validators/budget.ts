import vine from '@vinejs/vine'

const planLine = vine.object({
  description: vine.string().trim().minLength(1),
  fundId: vine.string().uuid().optional().nullable(),
  accountId: vine.string().uuid().optional().nullable(),
  amount: vine.number().decimal([0, 2]),
  remarks: vine.string().trim().optional().nullable(),
})

export const createFinancialPlanValidator = vine.compile(
  vine.object({
    planType: vine.enum(['app', 'wfp'] as const),
    fiscalYear: vine.string().trim().fixedLength(4),
    fiscalPeriodId: vine.string().uuid().optional().nullable(),
    title: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().optional().nullable(),
    lines: vine.array(planLine).optional(),
  })
)

export const updateFinancialPlanValidator = vine.compile(
  vine.object({
    fiscalYear: vine.string().trim().fixedLength(4).optional(),
    fiscalPeriodId: vine.string().uuid().optional().nullable(),
    title: vine.string().trim().minLength(1).maxLength(255).optional(),
    description: vine.string().trim().optional().nullable(),
    lines: vine.array(planLine).optional(),
  })
)

export const rejectValidator = vine.compile(
  vine.object({
    rejectionReason: vine.string().trim().minLength(1).maxLength(2000),
  })
)

const budgetLine = vine.object({
  fundId: vine.string().uuid(),
  accountId: vine.string().uuid(),
  uacsCode: vine.string().trim().maxLength(64).optional().nullable(),
  effect: vine.enum(['increase', 'decrease'] as const).optional(),
  amount: vine.number().decimal([0, 2]).positive(),
  remarks: vine.string().trim().optional().nullable(),
})

export const createBudgetDocumentValidator = vine.compile(
  vine.object({
    documentType: vine.enum(['annual', 'supplemental', 'realignment', 'adjustment'] as const),
    fiscalYear: vine.string().trim().fixedLength(4),
    fiscalPeriodId: vine.string().uuid().optional().nullable(),
    sourcePlanId: vine.string().uuid().optional().nullable(),
    title: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().optional().nullable(),
    lines: vine.array(budgetLine).minLength(1),
  })
)

export const createObligationValidator = vine.compile(
  vine.object({
    documentKind: vine.enum(['ors', 'burs', 'other'] as const),
    documentNumber: vine.string().trim().minLength(1).maxLength(64),
    fiscalYear: vine.string().trim().fixedLength(4),
    fundId: vine.string().uuid(),
    accountId: vine.string().uuid(),
    amount: vine.number().decimal([0, 2]).positive(),
    particulars: vine.string().trim().optional().nullable(),
  })
)

export const validateAvailabilityValidator = vine.compile(
  vine.object({
    fundId: vine.string().uuid(),
    accountId: vine.string().uuid(),
    fiscalYear: vine.string().trim().fixedLength(4),
    amount: vine.number().decimal([0, 2]).positive(),
  })
)
