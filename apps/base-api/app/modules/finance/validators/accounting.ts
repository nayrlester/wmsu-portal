import vine from '@vinejs/vine'

const journalLine = vine.object({
  fundId: vine.string().uuid(),
  accountId: vine.string().uuid(),
  budgetLineId: vine.string().uuid().optional().nullable(),
  debitAmount: vine.number().decimal([0, 2]).optional(),
  creditAmount: vine.number().decimal([0, 2]).optional(),
  subsidiaryEntityType: vine.string().trim().maxLength(32).optional().nullable(),
  subsidiaryEntityRef: vine.string().trim().maxLength(128).optional().nullable(),
  particulars: vine.string().trim().optional().nullable(),
})

export const createJournalValidator = vine.compile(
  vine.object({
    entryType: vine
      .enum([
        'journal',
        'jev',
        'voucher_payable',
        'disbursement_cash',
        'disbursement_check',
        'bank_transaction',
      ] as const)
      .optional(),
    entryNumber: vine.string().trim().maxLength(64).optional(),
    fiscalYear: vine.string().trim().fixedLength(4),
    fiscalPeriodId: vine.string().uuid().optional().nullable(),
    entryDate: vine.date({ formats: ['YYYY-MM-DD', 'iso8601'] }),
    description: vine.string().trim().minLength(1).maxLength(500),
    sourceModule: vine.string().trim().maxLength(64).optional().nullable(),
    sourceRef: vine.string().trim().maxLength(128).optional().nullable(),
    lines: vine.array(journalLine).minLength(2),
  })
)

export const createTaxRateValidator = vine.compile(
  vine.object({
    rateCode: vine.string().trim().minLength(1).maxLength(64),
    description: vine.string().trim().minLength(1).maxLength(255),
    ratePercent: vine.number().decimal([0, 4]).min(0),
    isActive: vine.boolean().optional(),
  })
)

export const createTaxEntryValidator = vine.compile(
  vine.object({
    rateId: vine.string().uuid(),
    payeeName: vine.string().trim().minLength(1).maxLength(255),
    payeeRef: vine.string().trim().maxLength(128).optional().nullable(),
    grossAmount: vine.number().decimal([0, 2]).positive(),
    transactionDate: vine.date({ formats: ['YYYY-MM-DD', 'iso8601'] }),
  })
)

export const remitTaxValidator = vine.compile(
  vine.object({
    ids: vine.array(vine.string().uuid()).minLength(1),
    remittanceBatch: vine.string().trim().minLength(1).maxLength(64),
  })
)

export const createBankReconValidator = vine.compile(
  vine.object({
    bankAccountId: vine.string().uuid(),
    statementDate: vine.date({ formats: ['YYYY-MM-DD', 'iso8601'] }),
    statementBalance: vine.number().decimal([0, 2]),
    bookBalance: vine.number().decimal([0, 2]).optional(),
    notes: vine.string().trim().optional().nullable(),
    lines: vine
      .array(
        vine.object({
          lineDate: vine.date({ formats: ['YYYY-MM-DD', 'iso8601'] }),
          description: vine.string().trim().minLength(1).maxLength(255),
          amount: vine.number().decimal([0, 2]).positive(),
          side: vine.enum(['deposit', 'withdrawal'] as const),
          cleared: vine.boolean().optional(),
          glEntryId: vine.string().uuid().optional().nullable(),
        })
      )
      .optional(),
  })
)

export const updateCoaValidator = vine.compile(
  vine.object({
    accountTitle: vine.string().trim().minLength(1).maxLength(255).optional(),
    accountType: vine.string().trim().minLength(1).maxLength(32).optional(),
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
