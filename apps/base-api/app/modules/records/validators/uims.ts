import vine from '@vinejs/vine'

// ── Organization ────────────────────────────────────────
export const updateOrganizationValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255).optional(),
    address: vine.string().maxLength(500).nullable().optional(),
    contactEmail: vine.string().email().nullable().optional(),
    contactPhone: vine.string().maxLength(64).nullable().optional(),
  })
)

// ── Campus ──────────────────────────────────────────────
export const createCampusValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }),
  })
)
export const updateCampusValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255).optional(),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }).optional(),
  })
)

// ── Office ──────────────────────────────────────────────
export const createOfficeValidator = vine.compile(
  vine.object({
    campusId: vine.string().uuid(),
    name: vine.string().minLength(2).maxLength(255),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }),
  })
)
export const updateOfficeValidator = vine.compile(
  vine.object({
    campusId: vine.string().uuid().optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }).optional(),
  })
)

// ── Department ──────────────────────────────────────────
export const createDepartmentValidator = vine.compile(
  vine.object({
    campusId: vine.string().uuid(),
    officeId: vine.string().uuid().optional(),
    name: vine.string().minLength(2).maxLength(255),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }),
    headName: vine.string().maxLength(255).optional(),
  })
)
export const updateDepartmentValidator = vine.compile(
  vine.object({
    campusId: vine.string().uuid().optional(),
    officeId: vine.string().uuid().nullable().optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }).optional(),
    headName: vine.string().maxLength(255).nullable().optional(),
  })
)

// ── Item Category ───────────────────────────────────────
export const createItemCategoryValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    code: vine.string().minLength(1).maxLength(64).alphaNumeric({ allowDashes: true }),
  })
)

// ── Item ────────────────────────────────────────────────
export const createItemValidator = vine.compile(
  vine.object({
    categoryId: vine.string().uuid().optional(),
    sku: vine.string().minLength(1).maxLength(64),
    barcode: vine.string().maxLength(64).optional(),
    name: vine.string().minLength(2).maxLength(255),
    uom: vine.string().maxLength(32),
    fundSource: vine.string().maxLength(120).optional(),
    brand: vine.string().maxLength(120).optional(),
    model: vine.string().maxLength(120).optional(),
    manufacturer: vine.string().maxLength(120).optional(),
    minStock: vine.number().min(0).optional(),
    maxStock: vine.number().min(0).optional(),
    reorderPoint: vine.number().min(0).optional(),
    valuationMethod: vine.string().in(['weighted_average', 'fifo', 'lifo']).optional(),
    supplierId: vine.string().uuid().optional(),
    safetyStock: vine.number().min(0).optional(),
    expiryTracked: vine.boolean().optional(),
    description: vine.string().optional(),
  })
)

export const importItemsValidator = vine.compile(
  vine.object({
    csv: vine.string().minLength(8).maxLength(2_000_000),
  })
)
export const updateItemValidator = vine.compile(
  vine.object({
    categoryId: vine.string().uuid().nullable().optional(),
    sku: vine.string().minLength(1).maxLength(64).optional(),
    barcode: vine.string().maxLength(64).nullable().optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    uom: vine.string().maxLength(32).optional(),
    fundSource: vine.string().maxLength(120).nullable().optional(),
    brand: vine.string().maxLength(120).nullable().optional(),
    model: vine.string().maxLength(120).nullable().optional(),
    manufacturer: vine.string().maxLength(120).nullable().optional(),
    minStock: vine.number().min(0).optional(),
    maxStock: vine.number().min(0).nullable().optional(),
    reorderPoint: vine.number().min(0).nullable().optional(),
    valuationMethod: vine.string().in(['weighted_average', 'fifo', 'lifo']).optional(),
    supplierId: vine.string().uuid().nullable().optional(),
    safetyStock: vine.number().min(0).optional(),
    expiryTracked: vine.boolean().optional(),
    description: vine.string().nullable().optional(),
  })
)

// ── Warehouse ───────────────────────────────────────────
export const createWarehouseValidator = vine.compile(
  vine.object({
    campusId: vine.string().uuid(),
    name: vine.string().minLength(2).maxLength(255),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }),
  })
)
export const updateWarehouseValidator = vine.compile(
  vine.object({
    campusId: vine.string().uuid().optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    code: vine.string().minLength(1).maxLength(32).alphaNumeric({ allowDashes: true }).optional(),
  })
)

// ── Warehouse Bin ───────────────────────────────────────
export const createWarehouseBinValidator = vine.compile(
  vine.object({
    zone: vine.string().maxLength(64).optional(),
    rack: vine.string().maxLength(64).optional(),
    shelf: vine.string().maxLength(64).optional(),
    binCode: vine.string().minLength(1).maxLength(64),
    capacity: vine.number().min(0).optional(),
  })
)

// ── Stock Movements ─────────────────────────────────────
const stockLineSchema = vine.object({
  itemId: vine.string().uuid(),
  warehouseId: vine.string().uuid(),
  binId: vine.string().uuid().optional(),
  quantity: vine.number().positive(),
  unitCost: vine.number().min(0).optional(),
})

export const stockBeginningValidator = vine.compile(
  vine.object({
    lines: vine.array(stockLineSchema).minLength(1),
    reference: vine.string().maxLength(120).optional(),
    notes: vine.string().optional(),
  })
)
export const stockReceiveValidator = vine.compile(
  vine.object({
    lines: vine.array(stockLineSchema).minLength(1),
    reference: vine.string().maxLength(120).optional(),
    notes: vine.string().optional(),
  })
)
export const stockIssueValidator = vine.compile(
  vine.object({
    lines: vine.array(stockLineSchema).minLength(1),
    reference: vine.string().maxLength(120).optional(),
    notes: vine.string().optional(),
  })
)
export const stockTransferValidator = vine.compile(
  vine.object({
    lines: vine.array(
      vine.object({
        itemId: vine.string().uuid(),
        fromWarehouseId: vine.string().uuid(),
        toWarehouseId: vine.string().uuid(),
        fromBinId: vine.string().uuid().optional(),
        toBinId: vine.string().uuid().optional(),
        quantity: vine.number().positive(),
      })
    ).minLength(1),
    reference: vine.string().maxLength(120).optional(),
    notes: vine.string().optional(),
  })
)
export const stockAdjustValidator = vine.compile(
  vine.object({
    lines: vine.array(
      vine.object({
        itemId: vine.string().uuid(),
        warehouseId: vine.string().uuid(),
        binId: vine.string().uuid().optional(),
        quantity: vine.number(),
        unitCost: vine.number().min(0).optional(),
        reason: vine.string().maxLength(255),
      })
    ).minLength(1),
    reference: vine.string().maxLength(120).optional(),
    notes: vine.string().optional(),
  })
)

// ── Asset ───────────────────────────────────────────────
export const createAssetValidator = vine.compile(
  vine.object({
    assetCode: vine.string().minLength(1).maxLength(32),
    propertyNumber: vine.string().maxLength(64).optional(),
    barcode: vine.string().maxLength(64).optional(),
    name: vine.string().minLength(2).maxLength(255),
    description: vine.string().optional(),
    assetType: vine.string().in(['equipment', 'furniture', 'vehicle', 'it_hardware', 'building', 'other']),
    serialNumber: vine.string().maxLength(120).optional(),
    model: vine.string().maxLength(120).optional(),
    manufacturer: vine.string().maxLength(120).optional(),
    fundSource: vine.string().maxLength(120).optional(),
    officeId: vine.string().uuid().optional(),
    purchaseDate: vine.string().optional(),
    purchaseCost: vine.number().min(0).optional(),
    warrantyExpiresAt: vine.string().optional(),
    notes: vine.string().optional(),
  })
)
export const updateAssetValidator = vine.compile(
  vine.object({
    assetCode: vine.string().minLength(1).maxLength(32).optional(),
    propertyNumber: vine.string().maxLength(64).nullable().optional(),
    barcode: vine.string().maxLength(64).nullable().optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    description: vine.string().nullable().optional(),
    assetType: vine.string().in(['equipment', 'furniture', 'vehicle', 'it_hardware', 'building', 'other']).optional(),
    serialNumber: vine.string().maxLength(120).nullable().optional(),
    model: vine.string().maxLength(120).nullable().optional(),
    manufacturer: vine.string().maxLength(120).nullable().optional(),
    fundSource: vine.string().maxLength(120).nullable().optional(),
    officeId: vine.string().uuid().nullable().optional(),
    purchaseDate: vine.string().nullable().optional(),
    purchaseCost: vine.number().min(0).nullable().optional(),
    warrantyExpiresAt: vine.string().nullable().optional(),
    notes: vine.string().nullable().optional(),
  })
)

export const assignAssetValidator = vine.compile(
  vine.object({
    custodianExternalId: vine.string().minLength(1).maxLength(64),
    custodianName: vine.string().maxLength(255).optional(),
    custodianEmail: vine.string().email().optional(),
    expectedReturnAt: vine.string().optional(),
  })
)

export const retireAssetValidator = vine.compile(
  vine.object({
    reason: vine.string().maxLength(255).optional(),
  })
)

export const scheduleMaintenanceValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(2).maxLength(255),
    description: vine.string().optional(),
    maintenanceType: vine.string().in(['preventive', 'corrective', 'emergency']).optional(),
    scheduledAt: vine.string(),
    assignedToUserId: vine.string().uuid().optional(),
    cost: vine.number().min(0).optional(),
    notes: vine.string().optional(),
  })
)

export const completeReturnValidator = vine.compile(
  vine.object({
    returnCondition: vine.string().maxLength(64).optional(),
    returnNotes: vine.string().optional(),
  })
)

export const completeMaintenanceValidator = vine.compile(
  vine.object({
    cost: vine.number().min(0).optional(),
    notes: vine.string().optional(),
  })
)

// ── Supplier ────────────────────────────────────────────
export const createSupplierValidator = vine.compile(
  vine.object({
    code: vine.string().minLength(1).maxLength(64),
    name: vine.string().minLength(2).maxLength(255),
    contactName: vine.string().maxLength(255).optional(),
    email: vine.string().email().optional(),
    phone: vine.string().maxLength(64).optional(),
    address: vine.string().maxLength(500).optional(),
    tin: vine.string().maxLength(64).optional(),
    active: vine.boolean().optional(),
  })
)
export const updateSupplierValidator = vine.compile(
  vine.object({
    code: vine.string().minLength(1).maxLength(64).optional(),
    name: vine.string().minLength(2).maxLength(255).optional(),
    contactName: vine.string().maxLength(255).nullable().optional(),
    email: vine.string().email().nullable().optional(),
    phone: vine.string().maxLength(64).nullable().optional(),
    address: vine.string().maxLength(500).nullable().optional(),
    tin: vine.string().maxLength(64).nullable().optional(),
    active: vine.boolean().optional(),
  })
)

// ── Requisitions ────────────────────────────────────────
export const createRequisitionValidator = vine.compile(
  vine.object({
    requestingOfficeId: vine.string().uuid().optional(),
    purpose: vine.string().optional(),
    lines: vine
      .array(
        vine.object({
          itemId: vine.string().uuid(),
          quantityRequested: vine.number().positive(),
          notes: vine.string().optional(),
        })
      )
      .minLength(1),
  })
)

export const approveRequisitionValidator = vine.compile(
  vine.object({
    lines: vine
      .array(
        vine.object({
          lineId: vine.string().uuid(),
          quantityApproved: vine.number().min(0),
        })
      )
      .optional(),
  })
)

export const rejectRequisitionValidator = vine.compile(
  vine.object({
    reason: vine.string().maxLength(500).optional(),
  })
)

export const fulfillRequisitionValidator = vine.compile(
  vine.object({
    warehouseId: vine.string().uuid(),
    lines: vine
      .array(
        vine.object({
          lineId: vine.string().uuid(),
          quantityIssued: vine.number().positive(),
          binId: vine.string().uuid().optional(),
        })
      )
      .minLength(1),
  })
)

// ── Stock return / disposal / reserve / release ─────────
export const stockReturnValidator = vine.compile(
  vine.object({
    lines: vine.array(stockLineSchema).minLength(1),
    reference: vine.string().maxLength(120).optional(),
    notes: vine.string().optional(),
  })
)
export const stockDisposalValidator = vine.compile(
  vine.object({
    lines: vine.array(stockLineSchema).minLength(1),
    reference: vine.string().maxLength(120).optional(),
    notes: vine.string().optional(),
    reason: vine.string().maxLength(255).optional(),
  })
)
export const stockReserveValidator = vine.compile(
  vine.object({
    itemId: vine.string().uuid(),
    warehouseId: vine.string().uuid(),
    quantity: vine.number().positive(),
    reference: vine.string().maxLength(120).optional(),
    requisitionId: vine.string().uuid().optional(),
    expiresAt: vine.string().optional(),
  })
)
export const stockReleaseValidator = vine.compile(
  vine.object({
    reservationId: vine.string().uuid(),
    quantity: vine.number().positive().optional(),
  })
)

// ── COA Documents ───────────────────────────────────────
const coaLineSchema = vine.object({
  assetId: vine.string().uuid().optional(),
  itemId: vine.string().uuid().optional(),
  description: vine.string().minLength(1).maxLength(500),
  propertyNumber: vine.string().maxLength(64).optional(),
  quantity: vine.number().positive().optional(),
  uom: vine.string().maxLength(32).optional(),
  unitCost: vine.number().min(0).optional(),
  totalCost: vine.number().min(0).optional(),
  condition: vine.string().maxLength(64).optional(),
  metadata: vine.any().optional(),
})

export const createCoaValidator = vine.compile(
  vine.object({
    formType: vine.string().in(['ICS', 'PAR', 'RPCPPE', 'IIRUP', 'WMR']),
    documentNo: vine.string().minLength(1).maxLength(64).optional(),
    assetId: vine.string().uuid().optional(),
    assignmentId: vine.string().uuid().optional(),
    custodianUserId: vine.string().uuid().optional(),
    custodianName: vine.string().maxLength(255).optional(),
    custodianExternalId: vine.string().maxLength(64).optional(),
    officeId: vine.string().uuid().optional(),
    documentDate: vine.string(),
    payload: vine.any().optional(),
    lines: vine.array(coaLineSchema).minLength(1),
  })
)
export const updateCoaValidator = vine.compile(
  vine.object({
    custodianUserId: vine.string().uuid().nullable().optional(),
    custodianName: vine.string().maxLength(255).nullable().optional(),
    custodianExternalId: vine.string().maxLength(64).nullable().optional(),
    officeId: vine.string().uuid().nullable().optional(),
    documentDate: vine.string().optional(),
    payload: vine.any().optional(),
    lines: vine.array(coaLineSchema).optional(),
  })
)

// ── Physical Counts ─────────────────────────────────────
export const createCountSessionValidator = vine.compile(
  vine.object({
    countType: vine.string().in(['stock', 'property']).optional(),
    warehouseId: vine.string().uuid().optional(),
    campusId: vine.string().uuid().optional(),
    scheduledDate: vine.string().optional(),
    sessionNo: vine.string().maxLength(64).optional(),
  })
)
export const scanCountLineValidator = vine.compile(
  vine.object({
    itemId: vine.string().uuid().optional(),
    assetId: vine.string().uuid().optional(),
    warehouseId: vine.string().uuid().optional(),
    binId: vine.string().uuid().optional(),
    countedQty: vine.number().min(0),
    systemQty: vine.number().min(0).optional(),
    condition: vine.string().maxLength(64).optional(),
    barcodeScanned: vine.string().maxLength(128).optional(),
    gpsLat: vine.number().optional(),
    gpsLng: vine.number().optional(),
    photoUrl: vine.string().maxLength(500).optional(),
    foundUntagged: vine.boolean().optional(),
    notes: vine.string().optional(),
  })
)

// ── Depreciation ────────────────────────────────────────
export const createDepreciationProfileValidator = vine.compile(
  vine.object({
    assetId: vine.string().uuid(),
    method: vine.string().in(['straight_line']).optional(),
    usefulLifeMonths: vine.number().positive(),
    residualRate: vine.number().min(0).max(1).optional(),
    acquisitionCost: vine.number().positive(),
    inServiceDate: vine.string(),
  })
)
export const runDepreciationValidator = vine.compile(
  vine.object({
    periodYear: vine.number().min(2000).max(2100),
    periodMonth: vine.number().min(1).max(12),
    assetId: vine.string().uuid().optional(),
  })
)

// ── Item extensions ─────────────────────────────────────
// Extend create/update item with supply fields (additive validators already exist;
// callers may pass these via merge in service when present in body).

