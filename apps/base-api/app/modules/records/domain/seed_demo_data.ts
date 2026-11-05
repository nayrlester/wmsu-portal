import env from '#start/env'
import Organization from '#modules/records/models/organization'
import Campus from '#modules/records/models/campus'
import Office from '#modules/records/models/office'
import Department from '#modules/records/models/department'
import User from '#modules/records/models/user'
import Role from '#modules/records/models/role'
import Permission from '#modules/records/models/permission'
import Supplier from '#modules/records/models/supplier'
import Warehouse from '#modules/records/models/warehouse'
import WarehouseBin from '#modules/records/models/warehouse_bin'
import ItemCategory from '#modules/records/models/item_category'
import Item from '#modules/records/models/item'
import Asset from '#modules/records/models/asset'
import StockBalance from '#modules/records/models/stock_balance'
import { UIMS_PERMISSIONS, AssetStatus, AssetLifecycleStage } from '#modules/records/domain/enums/index'
import { TORMS_PERMISSIONS, TORMS_ROLE_DEFS } from '#modules/records/domain/torms/torms_permissions'
import { StockMovementService } from '#modules/records/services/stock_movement_service'

async function upsertDemoOrganization(orgCode: string, displayName: string) {
  const pinnedId = env.get('PLATFORM_DEFAULT_ORG_ID')?.trim()
  if (pinnedId) {
    const byCode = await Organization.findBy('code', orgCode)
    if (byCode) return byCode
    const byId = await Organization.find(pinnedId)
    if (byId) {
      if (byId.code !== orgCode || byId.name !== displayName) {
        byId.code = orgCode
        byId.name = displayName
        await byId.save()
      }
      return byId
    }
    return Organization.create({ id: pinnedId, code: orgCode, name: displayName })
  }
  return Organization.updateOrCreate({ code: orgCode }, { name: displayName, code: orgCode })
}

export interface SeedDemoResult {
  orgCode: string
  orgId: string
  roles: string[]
  categories: number
  items: number
  assets: number
  warehouses: number
  stockSeeded: boolean
  users: string[]
}

/**
 * Idempotent demo dataset for UNI (or PLATFORM_DEFAULT_ORG_CODE).
 * Safe to re-run: only creates missing DEMO-* / catalog rows; never deletes.
 */
export async function seedUimsDemoData(orgCode = 'UNI'): Promise<SeedDemoResult> {
  for (const p of [...UIMS_PERMISSIONS, ...TORMS_PERMISSIONS]) {
    await Permission.updateOrCreate({ code: p.code }, { name: p.name, module: p.module })
  }

  const org = await upsertDemoOrganization(
    orgCode,
    orgCode === 'UNI' ? 'Western Mindanao State University' : orgCode
  )

  const campus = await Campus.updateOrCreate(
    { organizationId: org.id, code: 'MAIN' },
    { organizationId: org.id, name: 'Main Campus', code: 'MAIN' }
  )

  const supplyOffice = await Office.updateOrCreate(
    { organizationId: org.id, code: 'SUPPLY' },
    { organizationId: org.id, campusId: campus.id, name: 'Supply Office', code: 'SUPPLY' }
  )

  await Office.updateOrCreate(
    { organizationId: org.id, code: 'PROP' },
    { organizationId: org.id, campusId: campus.id, name: 'Property Office', code: 'PROP' }
  )

  await Department.updateOrCreate(
    { organizationId: org.id, code: 'ICT' },
    {
      organizationId: org.id,
      campusId: campus.id,
      officeId: supplyOffice.id,
      name: 'ICT Department',
      code: 'ICT',
      headName: 'ICT Head',
    }
  )

  await Department.updateOrCreate(
    { organizationId: org.id, code: 'ADMIN' },
    {
      organizationId: org.id,
      campusId: campus.id,
      officeId: supplyOffice.id,
      name: 'Admin Department',
      code: 'ADMIN',
      headName: 'Admin Head',
    }
  )

  const allPermissions = await Permission.all()
  const byCode = (codes: string[]) =>
    allPermissions.filter((p) => codes.includes(p.code)).map((p) => p.id)

  const roleDefs: Array<{ slug: string; name: string; codes?: string[]; all?: boolean; readOnly?: boolean }> =
    [
      { slug: 'admin', name: 'Administrator', all: true },
      { slug: 'staff', name: 'Staff', readOnly: true },
      {
        slug: 'viewer',
        name: 'Viewer',
        codes: ['org.read', 'items.read', 'assets.read', 'reports.read', 'warehouses.read', 'stock.read'],
      },
      {
        slug: 'supply_officer',
        name: 'Supply Officer',
        codes: [
          'org.read',
          'items.read',
          'items.write',
          'warehouses.read',
          'warehouses.write',
          'stock.read',
          'stock.write',
          'suppliers.read',
          'suppliers.write',
          'requisitions.read',
          'requisitions.write',
          'coa.read',
          'coa.write',
          'counts.read',
          'counts.write',
          'assets.read',
          'assets.write',
          'depreciation.read',
          'depreciation.write',
          'reports.read',
          'reports.export',
          'audit.read',
        ],
      },
      {
        slug: 'property_custodian',
        name: 'Property Custodian',
        codes: [
          'org.read',
          'assets.read',
          'assets.write',
          'coa.read',
          'coa.write',
          'counts.read',
          'counts.write',
          'depreciation.read',
          'reports.read',
          'reports.export',
        ],
      },
      {
        slug: 'supply_clerk',
        name: 'Supply Clerk',
        codes: [
          'org.read',
          'items.read',
          'warehouses.read',
          'stock.read',
          'stock.write',
          'suppliers.read',
          'requisitions.read',
          'requisitions.write',
          'counts.read',
          'counts.write',
          'assets.read',
          'reports.read',
        ],
      },
    ]

  const roleSlugs: string[] = []
  for (const def of roleDefs) {
    const role = await Role.updateOrCreate(
      { organizationId: org.id, slug: def.slug },
      { organizationId: org.id, slug: def.slug, name: def.name }
    )
    if (def.all) {
      await role.related('permissions').sync(allPermissions.map((p) => p.id))
    } else if (def.readOnly) {
      await role.related('permissions').sync(
        allPermissions.filter((p) => p.code.endsWith('.read')).map((p) => p.id)
      )
    } else if (def.codes) {
      await role.related('permissions').sync(byCode(def.codes))
    }
    roleSlugs.push(def.slug)
  }

  for (const def of TORMS_ROLE_DEFS) {
    const role = await Role.updateOrCreate(
      { organizationId: org.id, slug: def.slug },
      { organizationId: org.id, slug: def.slug, name: def.name }
    )
    await role.related('permissions').sync(byCode([...def.codes]))
    roleSlugs.push(def.slug)
  }

  const adminRole = await Role.query().where('organizationId', org.id).where('slug', 'admin').firstOrFail()
  const supplyClerkRole = await Role.query()
    .where('organizationId', org.id)
    .where('slug', 'supply_clerk')
    .firstOrFail()
  const viewerRole = await Role.query().where('organizationId', org.id).where('slug', 'viewer').firstOrFail()

  const demoPassword = env.get('DEMO_SEED_PASSWORD') || 'ChangeMe123!'

  const admin = await User.updateOrCreate(
    { email: 'admin@uims.local' },
    {
      organizationId: org.id,
      email: 'admin@uims.local',
      password: demoPassword,
      fullName: 'UIMS Admin',
      status: 'active',
    }
  )
  await admin.related('roles').sync({ [adminRole.id]: { organization_id: org.id } })

  const clerk = await User.updateOrCreate(
    { email: 'clerk@uims.local' },
    {
      organizationId: org.id,
      email: 'clerk@uims.local',
      password: demoPassword,
      fullName: 'Supply Clerk',
      status: 'active',
    }
  )
  await clerk.related('roles').sync({ [supplyClerkRole.id]: { organization_id: org.id } })

  const viewer = await User.updateOrCreate(
    { email: 'viewer@uims.local' },
    {
      organizationId: org.id,
      email: 'viewer@uims.local',
      password: demoPassword,
      fullName: 'Read Only Viewer',
      status: 'active',
    }
  )
  await viewer.related('roles').sync({ [viewerRole.id]: { organization_id: org.id } })

  const studentRequesterRole = await Role.query()
    .where('organizationId', org.id)
    .where('slug', 'student_requester')
    .firstOrFail()
  const requester = await User.updateOrCreate(
    { email: 'requester@records.local' },
    {
      organizationId: org.id,
      email: 'requester@records.local',
      password: demoPassword,
      fullName: 'Student Requester',
      status: 'active',
    }
  )
  await requester.related('roles').sync({
    [studentRequesterRole.id]: { organization_id: org.id },
  })

  for (const demoUser of [admin, clerk, viewer, requester]) {
    demoUser.password = demoPassword
    await demoUser.save()
  }

  const supplier = await Supplier.updateOrCreate(
    { organizationId: org.id, code: 'SUP-001' },
    {
      organizationId: org.id,
      code: 'SUP-001',
      name: 'General Office Supplies Co.',
      contactName: 'Juan Dela Cruz',
      email: 'sales@gos.local',
      phone: '+63-2-8000-0000',
      address: 'Quezon City',
      tin: '000-000-000-000',
      active: true,
    }
  )

  let warehouse = await Warehouse.query()
    .where('organizationId', org.id)
    .where('code', 'MAIN-WH')
    .first()

  if (!warehouse) {
    warehouse = await Warehouse.create({
      organizationId: org.id,
      campusId: campus.id,
      name: 'Main Supply Warehouse',
      code: 'MAIN-WH',
      locationType: 'warehouse',
    })
  }

  const existingBins = await WarehouseBin.query().where('warehouseId', warehouse.id)
  if (!existingBins.length) {
    await WarehouseBin.createMany([
      { warehouseId: warehouse.id, binCode: 'A-01-01', zone: 'A', rack: '01', shelf: '01', capacity: 500 },
      { warehouseId: warehouse.id, binCode: 'A-01-02', zone: 'A', rack: '01', shelf: '02', capacity: 500 },
      { warehouseId: warehouse.id, binCode: 'B-01-01', zone: 'B', rack: '01', shelf: '01', capacity: 300 },
    ])
  }

  const bins = await WarehouseBin.query().where('warehouseId', warehouse.id).orderBy('binCode')
  const binA = bins[0] ?? null

  const categories = [
    { code: 'OFFICE', name: 'Office Supplies' },
    { code: 'ICT', name: 'ICT Consumables' },
    { code: 'JANITOR', name: 'Janitorial' },
  ] as const

  const categoryIds: Record<string, string> = {}
  for (const cat of categories) {
    const row = await ItemCategory.updateOrCreate(
      { organizationId: org.id, code: cat.code },
      { organizationId: org.id, code: cat.code, name: cat.name }
    )
    categoryIds[cat.code] = row.id
  }

  const itemDefs = [
    {
      sku: 'DEMO-PAPER-A4',
      name: 'Bond Paper A4 (ream)',
      category: 'OFFICE',
      uom: 'ream',
      minStock: 20,
      qty: 8,
      unitCost: 180,
      expiryTracked: false,
    },
    {
      sku: 'DEMO-PEN-BLU',
      name: 'Ballpen Blue (box)',
      category: 'OFFICE',
      uom: 'box',
      minStock: 10,
      qty: 45,
      unitCost: 120,
      expiryTracked: false,
    },
    {
      sku: 'DEMO-INK-BK',
      name: 'Printer Ink Black',
      category: 'ICT',
      uom: 'pc',
      minStock: 5,
      qty: 3,
      unitCost: 950,
      expiryTracked: false,
    },
    {
      sku: 'DEMO-USB-32',
      name: 'USB Flash Drive 32GB',
      category: 'ICT',
      uom: 'pc',
      minStock: 15,
      qty: 40,
      unitCost: 350,
      expiryTracked: false,
    },
    {
      sku: 'DEMO-ALCOHOL',
      name: 'Isopropyl Alcohol 500ml',
      category: 'JANITOR',
      uom: 'btl',
      minStock: 12,
      qty: 25,
      unitCost: 85,
      expiryTracked: true,
      expiresInDays: 20,
    },
    {
      sku: 'DEMO-MASK',
      name: 'Surgical Mask (box of 50)',
      category: 'JANITOR',
      uom: 'box',
      minStock: 8,
      qty: 60,
      unitCost: 95,
      expiryTracked: true,
      expiresInDays: 45,
    },
  ] as const

  const stockService = new StockMovementService()
  let stockSeeded = false

  for (const def of itemDefs) {
    const item = await Item.updateOrCreate(
      { organizationId: org.id, sku: def.sku },
      {
        organizationId: org.id,
        sku: def.sku,
        name: def.name,
        categoryId: categoryIds[def.category] ?? null,
        uom: def.uom,
        minStock: def.minStock,
        reorderPoint: def.minStock,
        safetyStock: Math.max(1, Math.floor(def.minStock / 2)),
        maxStock: def.minStock * 10,
        expiryTracked: def.expiryTracked,
        supplierId: supplier.id,
        valuationMethod: 'weighted_average',
        brand: 'Demo',
        description: `Demo item ${def.sku}`,
      }
    )

    const existingBal = await StockBalance.query()
      .where('itemId', item.id)
      .where('warehouseId', warehouse.id)
      .first()

    if (!existingBal || Number(existingBal.quantity) <= 0) {
      const expiresAt =
        'expiresInDays' in def && def.expiresInDays
          ? new Date(Date.now() + def.expiresInDays * 86400000).toISOString().slice(0, 10)
          : null

      await stockService.processBeginning(
        org.id,
        [
          {
            itemId: item.id,
            warehouseId: warehouse.id,
            binId: binA?.id ?? null,
            quantity: def.qty,
            unitCost: def.unitCost,
          },
        ],
        `DEMO-BEG-${def.sku}`,
        'Demo beginning balance',
        admin.id
      )

      if (expiresAt) {
        const bal = await StockBalance.query()
          .where('itemId', item.id)
          .where('warehouseId', warehouse.id)
          .first()
        if (bal) {
          bal.expiresAt = expiresAt
          bal.lotNumber = `LOT-${def.sku}`
          await bal.save()
        }
      }
      stockSeeded = true
    }
  }

  // One demo outbound so Recent Movements has variety
  const paper = await Item.query().where('organizationId', org.id).where('sku', 'DEMO-PAPER-A4').first()
  if (paper) {
    const alreadyIssued = await StockBalance.query()
      .where('itemId', paper.id)
      .where('warehouseId', warehouse.id)
      .first()
    // Only issue once: qty seeded at 8; if still 8, run a small issue for activity
    if (alreadyIssued && Number(alreadyIssued.quantity) === 8) {
      await stockService.processIssue(
        org.id,
        [{ itemId: paper.id, warehouseId: warehouse.id, binId: binA?.id ?? null, quantity: 2 }],
        'DEMO-ISSUE-001',
        'Demo issue to Admin Dept',
        admin.id
      )
      stockSeeded = true
    }
  }

  const assetDefs = [
    {
      assetCode: 'DEMO-LAPTOP-001',
      name: 'Dell Latitude 5540',
      assetType: 'equipment',
      purchaseCost: 52160,
      status: AssetStatus.AVAILABLE,
    },
    {
      assetCode: 'DEMO-PROJ-001',
      name: 'Epson Projector EB-X06',
      assetType: 'equipment',
      purchaseCost: 28000,
      status: AssetStatus.ASSIGNED,
      custodianName: 'ICT Head',
    },
    {
      assetCode: 'DEMO-DESK-001',
      name: 'Executive Office Desk',
      assetType: 'furniture',
      purchaseCost: 15000,
      status: AssetStatus.AVAILABLE,
    },
  ] as const

  for (const a of assetDefs) {
    await Asset.updateOrCreate(
      { organizationId: org.id, assetCode: a.assetCode },
      {
        organizationId: org.id,
        assetCode: a.assetCode,
        name: a.name,
        assetType: a.assetType,
        officeId: supplyOffice.id,
        purchaseDate: '2024-06-15',
        purchaseCost: a.purchaseCost,
        status: a.status,
        lifecycleStage: AssetLifecycleStage.ACTIVE,
        custodianName: 'custodianName' in a ? a.custodianName : null,
        manufacturer: a.assetType === 'equipment' ? 'Demo OEM' : null,
        fundSource: 'GAA',
        createdBy: admin.id,
        updatedBy: admin.id,
      }
    )
  }

  const itemCount = await Item.query().where('organizationId', org.id).whereNull('deletedAt').count('* as total')
  const assetCount = await Asset.query().where('organizationId', org.id).whereNull('deletedAt').count('* as total')
  const whCount = await Warehouse.query().where('organizationId', org.id).count('* as total')

  return {
    orgCode: org.code,
    orgId: org.id,
    roles: roleSlugs,
    categories: categories.length,
    items: Number(itemCount[0].$extras.total),
    assets: Number(assetCount[0].$extras.total),
    warehouses: Number(whCount[0].$extras.total),
    stockSeeded,
    users: ['admin@uims.local', 'clerk@uims.local', 'viewer@uims.local', 'requester@records.local'],
  }
}
