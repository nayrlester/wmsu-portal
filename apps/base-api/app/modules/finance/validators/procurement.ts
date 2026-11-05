import vine from '@vinejs/vine'

export const vendorValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(64),
    name: vine.string().trim().minLength(1).maxLength(255),
    contactName: vine.string().trim().maxLength(255).optional(),
    email: vine.string().email().optional(),
    phone: vine.string().trim().maxLength(64).optional(),
    address: vine.string().trim().maxLength(500).optional(),
    tin: vine.string().trim().maxLength(64).optional(),
    paymentTerms: vine.string().trim().maxLength(255).optional(),
    eligibilityValidUntil: vine.string().optional(),
    eligibilityNotes: vine.string().optional(),
    performanceNotes: vine.string().optional(),
    active: vine.boolean().optional(),
  })
)

export const createPrValidator = vine.compile(
  vine.object({
    prNumber: vine.string().trim().maxLength(64).optional(),
    purpose: vine.string().trim().optional(),
    requestingOfficeId: vine.string().uuid().optional(),
    fiscalYear: vine.string().trim().minLength(4).maxLength(4),
    fundId: vine.string().uuid().optional(),
    accountId: vine.string().uuid().optional(),
    budgetLineId: vine.string().uuid().optional(),
    financialPlanId: vine.string().uuid().optional(),
    lines: vine
      .array(
        vine.object({
          description: vine.string().trim().minLength(1).maxLength(500),
          quantity: vine.number().positive(),
          uom: vine.string().trim().maxLength(32).optional(),
          unitCost: vine.number().min(0).optional(),
          estimatedAmount: vine.number().min(0).optional(),
          itemId: vine.string().uuid().optional(),
        })
      )
      .minLength(1),
  })
)

export const rejectPrValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(1).maxLength(1000),
  })
)

export const createRfqValidator = vine.compile(
  vine.object({
    purchaseRequisitionId: vine.string().uuid(),
    rfqNumber: vine.string().trim().maxLength(64).optional(),
    method: vine.enum(['quotation', 'bidding'] as const).optional(),
    philgepsReference: vine.string().trim().maxLength(128).optional(),
    notes: vine.string().optional(),
  })
)

export const createQuotationValidator = vine.compile(
  vine.object({
    rfqId: vine.string().uuid(),
    supplierId: vine.string().uuid(),
    quotationRef: vine.string().trim().maxLength(128).optional(),
    amount: vine.number().min(0),
    submittedAt: vine.string().optional(),
    notes: vine.string().optional(),
  })
)

export const createAbstractValidator = vine.compile(
  vine.object({
    rfqId: vine.string().uuid(),
    abstractNumber: vine.string().trim().maxLength(64).optional(),
    quotationIds: vine.array(vine.string().uuid()).minLength(1),
    notes: vine.string().optional(),
  })
)

export const createAwardValidator = vine.compile(
  vine.object({
    quotationId: vine.string().uuid(),
    abstractId: vine.string().uuid().optional(),
    awardedAmount: vine.number().min(0).optional(),
    philgepsReference: vine.string().trim().maxLength(128).optional(),
    notes: vine.string().optional(),
  })
)

export const createPoValidator = vine.compile(
  vine.object({
    poNumber: vine.string().trim().maxLength(64).optional(),
    prId: vine.string().uuid().optional(),
    awardId: vine.string().uuid().optional(),
    supplierId: vine.string().uuid().optional(),
    supplierName: vine.string().trim().maxLength(255).optional(),
    totalAmount: vine.number().min(0).optional(),
    terms: vine.string().optional(),
    philgepsReference: vine.string().trim().maxLength(128).optional(),
    contractNumber: vine.string().trim().maxLength(128).optional(),
    fiscalYear: vine.string().trim().maxLength(4).optional(),
    description: vine.string().trim().maxLength(500).optional(),
    lines: vine
      .array(
        vine.object({
          description: vine.string().trim().minLength(1).maxLength(500),
          quantity: vine.number().positive(),
          uom: vine.string().trim().maxLength(32).optional(),
          unitCost: vine.number().min(0),
          lineAmount: vine.number().min(0).optional(),
        })
      )
      .optional(),
  })
)

export const createDeliveryValidator = vine.compile(
  vine.object({
    purchaseOrderId: vine.string().uuid(),
    deliveryNumber: vine.string().trim().maxLength(64).optional(),
    deliveredOn: vine.string(),
    notes: vine.string().optional(),
    lines: vine
      .array(
        vine.object({
          purchaseOrderLineId: vine.string().uuid().optional(),
          quantityDelivered: vine.number().positive(),
          conditionNotes: vine.string().trim().maxLength(500).optional(),
        })
      )
      .minLength(1),
  })
)

export const createIarValidator = vine.compile(
  vine.object({
    purchaseOrderId: vine.string().uuid(),
    deliveryId: vine.string().uuid(),
    iarNumber: vine.string().trim().maxLength(64).optional(),
    result: vine.enum(['accepted', 'rejected', 'partial'] as const).optional(),
    notes: vine.string().optional(),
  })
)

export const documentRefValidator = vine.compile(
  vine.object({
    entityType: vine.string().trim().minLength(1).maxLength(64),
    entityId: vine.string().uuid(),
    category: vine.string().trim().minLength(1).maxLength(64),
    fileName: vine.string().trim().minLength(1).maxLength(255),
    externalRef: vine.string().trim().maxLength(255).optional(),
    mimeType: vine.string().trim().maxLength(128).optional(),
    sizeBytes: vine.number().min(0).optional(),
  })
)
