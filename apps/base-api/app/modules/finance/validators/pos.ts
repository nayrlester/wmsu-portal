import vine from '@vinejs/vine'

export const terminalValidator = vine.compile(
  vine.object({
    terminalCode: vine.string().trim().minLength(1).maxLength(64),
    name: vine.string().trim().minLength(1).maxLength(255),
    isActive: vine.boolean().optional(),
    fundId: vine.string().uuid().optional(),
    cashAccountId: vine.string().uuid().optional(),
    revenueAccountId: vine.string().uuid().optional(),
    orSeriesId: vine.string().uuid().optional(),
  })
)

export const catalogItemValidator = vine.compile(
  vine.object({
    itemCode: vine.string().trim().minLength(1).maxLength(64),
    description: vine.string().trim().minLength(1).maxLength(500),
    category: vine.string().trim().maxLength(128).optional(),
    itemKind: vine.enum(['product', 'service'] as const).optional(),
    unitPrice: vine.number().min(0),
    taxPercent: vine.number().min(0).optional(),
    discountPercent: vine.number().min(0).optional(),
    isActive: vine.boolean().optional(),
    tracksInventory: vine.boolean().optional(),
    uimsItemRef: vine.string().trim().maxLength(128).optional(),
    reorderThreshold: vine.number().min(0).optional(),
  })
)

export const createSaleValidator = vine.compile(
  vine.object({
    terminalId: vine.string().uuid().optional(),
    saleNumber: vine.string().trim().maxLength(64).optional(),
    idempotencyKey: vine.string().trim().maxLength(128).optional(),
    lines: vine
      .array(
        vine.object({
          catalogItemId: vine.string().uuid().optional(),
          itemCode: vine.string().trim().maxLength(64).optional(),
          description: vine.string().trim().maxLength(500).optional(),
          quantity: vine.number().positive(),
          unitPrice: vine.number().min(0).optional(),
          taxPercent: vine.number().min(0).optional(),
          discountPercent: vine.number().min(0).optional(),
          uimsItemRef: vine.string().trim().maxLength(128).optional(),
        })
      )
      .minLength(1),
  })
)

export const completeSaleValidator = vine.compile(
  vine.object({
    payments: vine
      .array(
        vine.object({
          paymentMethod: vine.enum(['cash', 'card', 'e_wallet', 'other'] as const),
          amount: vine.number().min(0),
          paymentReference: vine.string().trim().maxLength(128).optional(),
        })
      )
      .minLength(1),
  })
)

export const voidSaleValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(1).maxLength(1000),
  })
)

export const eodValidator = vine.compile(
  vine.object({
    businessDate: vine.string().optional(),
    terminalId: vine.string().uuid().optional(),
    notes: vine.string().optional(),
  })
)

export const stockSnapshotValidator = vine.compile(
  vine.object({
    uimsItemRef: vine.string().trim().minLength(1).maxLength(128),
    quantityOnHand: vine.number().min(0),
    uom: vine.string().trim().maxLength(32).optional(),
    source: vine.string().trim().maxLength(64).optional(),
  })
)
