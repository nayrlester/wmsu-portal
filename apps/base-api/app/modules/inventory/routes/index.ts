import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/inventory/middleware_registry'

const DocsController = () => import('#modules/inventory/controllers/docs_controller')
const AuthController = () => import('#modules/inventory/controllers/auth_controller')
const OrgController = () => import('#modules/inventory/controllers/org_controller')
const UsersController = () => import('#modules/inventory/controllers/users_controller')
const RolesController = () => import('#modules/inventory/controllers/roles_controller')
const PermissionsController = () => import('#modules/inventory/controllers/permissions_controller')
const ItemCategoriesController = () => import('#modules/inventory/controllers/item_categories_controller')
const ItemsController = () => import('#modules/inventory/controllers/items_controller')
const WarehousesController = () => import('#modules/inventory/controllers/warehouses_controller')
const StockMovementsController = () => import('#modules/inventory/controllers/stock_movements_controller')
const AssetsController = () => import('#modules/inventory/controllers/assets_controller')
const DashboardController = () => import('#modules/inventory/controllers/dashboard_controller')
const InternalCustodianshipsController = () => import('#modules/inventory/controllers/internal_custodianships_controller')
const AuditLogsController = () => import('#modules/inventory/controllers/audit_logs_controller')
const SuppliersController = () => import('#modules/inventory/controllers/suppliers_controller')
const RequisitionsController = () => import('#modules/inventory/controllers/requisitions_controller')
const CoaController = () => import('#modules/inventory/controllers/coa_controller')
const PhysicalCountsController = () => import('#modules/inventory/controllers/physical_counts_controller')
const DepreciationController = () => import('#modules/inventory/controllers/depreciation_controller')
const ReportsController = () => import('#modules/inventory/controllers/reports_controller')

// ── Health ──

// ── Public auth + docs ──
router
  .group(() => {
    router.get('/docs', [DocsController, 'swagger'])
    router.get('/docs/openapi.yaml', [DocsController, 'openapi'])
    router
      .post('/auth/login', [AuthController, 'login'])
      .use(middleware.rateLimit({ max: 10, windowMs: 15 * 60_000, prefix: 'login' }))
    router
      .post('/auth/refresh', [AuthController, 'refresh'])
      .use(middleware.rateLimit({ max: 30, windowMs: 60_000, prefix: 'refresh' }))
  })
  .prefix('/api/v1/inventory').as('inventory')

// ── Authenticated routes ──
router
  .group(() => {
    // Auth
    router.post('/auth/logout', [AuthController, 'logout'])
    router.get('/auth/me', [AuthController, 'me'])

    // Dashboard
    router.get('/dashboard/summary', [DashboardController, 'summary']).use(middleware.permission(['reports.read']))

    // Organization profile
    router.get('/org', [OrgController, 'show']).use(middleware.permission(['org.read']))
    router.patch('/org', [OrgController, 'update']).use(middleware.permission(['org.write']))

    // Organization — campuses
    router.get('/org/campuses', [OrgController, 'listCampuses']).use(middleware.permission(['org.read']))
    router.post('/org/campuses', [OrgController, 'createCampus']).use(middleware.permission(['org.write']))
    router.get('/org/campuses/:id', [OrgController, 'getCampus']).use(middleware.permission(['org.read']))
    router.patch('/org/campuses/:id', [OrgController, 'updateCampus']).use(middleware.permission(['org.write']))
    router.delete('/org/campuses/:id', [OrgController, 'deleteCampus']).use(middleware.permission(['org.write']))

    // Organization — offices
    router.get('/org/offices', [OrgController, 'listOffices']).use(middleware.permission(['org.read']))
    router.post('/org/offices', [OrgController, 'createOffice']).use(middleware.permission(['org.write']))
    router.get('/org/offices/:id', [OrgController, 'getOffice']).use(middleware.permission(['org.read']))
    router.patch('/org/offices/:id', [OrgController, 'updateOffice']).use(middleware.permission(['org.write']))
    router.delete('/org/offices/:id', [OrgController, 'deleteOffice']).use(middleware.permission(['org.write']))

    // Organization — departments
    router.get('/org/departments', [OrgController, 'listDepartments']).use(middleware.permission(['org.read']))
    router.post('/org/departments', [OrgController, 'createDepartment']).use(middleware.permission(['org.write']))
    router.get('/org/departments/:id', [OrgController, 'getDepartment']).use(middleware.permission(['org.read']))
    router.patch('/org/departments/:id', [OrgController, 'updateDepartment']).use(middleware.permission(['org.write']))
    router.delete('/org/departments/:id', [OrgController, 'deleteDepartment']).use(middleware.permission(['org.write']))

    // Users
    router.get('/users', [UsersController, 'index']).use(middleware.permission(['users.read']))
    router.post('/users', [UsersController, 'store']).use(middleware.permission(['users.write']))
    router.get('/users/:id', [UsersController, 'show']).use(middleware.permission(['users.read']))
    router.patch('/users/:id', [UsersController, 'update']).use(middleware.permission(['users.write']))
    router.delete('/users/:id', [UsersController, 'destroy']).use(middleware.permission(['users.write']))

    // RBAC
    router.get('/permissions', [PermissionsController, 'index']).use(middleware.permission(['roles.read']))
    router.get('/roles', [RolesController, 'index']).use(middleware.permission(['roles.read']))
    router.post('/roles', [RolesController, 'store']).use(middleware.permission(['roles.write']))
    router.get('/roles/:id', [RolesController, 'show']).use(middleware.permission(['roles.read']))
    router.patch('/roles/:id', [RolesController, 'update']).use(middleware.permission(['roles.write']))
    router.delete('/roles/:id', [RolesController, 'destroy']).use(middleware.permission(['roles.write']))

    // Item categories
    router.get('/item-categories', [ItemCategoriesController, 'index']).use(middleware.permission(['items.read']))
    router.post('/item-categories', [ItemCategoriesController, 'store']).use(middleware.permission(['items.write']))
    router.get('/item-categories/:id', [ItemCategoriesController, 'show']).use(middleware.permission(['items.read']))
    router.patch('/item-categories/:id', [ItemCategoriesController, 'update']).use(middleware.permission(['items.write']))
    router.delete('/item-categories/:id', [ItemCategoriesController, 'destroy']).use(middleware.permission(['items.write']))

    // Items
    router.get('/items', [ItemsController, 'index']).use(middleware.permission(['items.read']))
    router.post('/items', [ItemsController, 'store']).use(middleware.permission(['items.write']))
    router.post('/items/import', [ItemsController, 'importCsv']).use(middleware.permission(['items.write']))
    router.get('/items/:id', [ItemsController, 'show']).use(middleware.permission(['items.read']))
    router.patch('/items/:id', [ItemsController, 'update']).use(middleware.permission(['items.write']))
    router.delete('/items/:id', [ItemsController, 'destroy']).use(middleware.permission(['items.write']))

    // Warehouses + bins
    router.get('/warehouses', [WarehousesController, 'index']).use(middleware.permission(['warehouses.read']))
    router.post('/warehouses', [WarehousesController, 'store']).use(middleware.permission(['warehouses.write']))
    router.get('/warehouses/:id', [WarehousesController, 'show']).use(middleware.permission(['warehouses.read']))
    router.patch('/warehouses/:id', [WarehousesController, 'update']).use(middleware.permission(['warehouses.write']))
    router.delete('/warehouses/:id', [WarehousesController, 'destroy']).use(middleware.permission(['warehouses.write']))
    router.get('/warehouses/:id/bins', [WarehousesController, 'listBins']).use(middleware.permission(['warehouses.read']))
    router.post('/warehouses/:id/bins', [WarehousesController, 'createBin']).use(middleware.permission(['warehouses.write']))
    router.delete('/warehouses/:id/bins/:binId', [WarehousesController, 'deleteBin']).use(middleware.permission(['warehouses.write']))

    // Stock movements
    router
      .post('/stock/beginning', [StockMovementsController, 'beginning'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/receive', [StockMovementsController, 'receive'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/issue', [StockMovementsController, 'issue'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/transfer', [StockMovementsController, 'transfer'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/adjust', [StockMovementsController, 'adjust'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/return', [StockMovementsController, 'returnStock'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/disposal', [StockMovementsController, 'disposal'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/reserve', [StockMovementsController, 'reserve'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router
      .post('/stock/release', [StockMovementsController, 'release'])
      .use([middleware.permission(['stock.write']), middleware.idempotency()])
    router.get('/stock/transactions', [StockMovementsController, 'transactions']).use(middleware.permission(['stock.read']))
    router.get('/stock/ledger/:itemId', [StockMovementsController, 'ledger']).use(middleware.permission(['stock.read']))
    router.get('/stock/balances', [StockMovementsController, 'balances']).use(middleware.permission(['stock.read']))

    // Suppliers
    router.get('/suppliers', [SuppliersController, 'index']).use(middleware.permission(['suppliers.read']))
    router.post('/suppliers', [SuppliersController, 'store']).use(middleware.permission(['suppliers.write']))
    router.get('/suppliers/:id', [SuppliersController, 'show']).use(middleware.permission(['suppliers.read']))
    router.patch('/suppliers/:id', [SuppliersController, 'update']).use(middleware.permission(['suppliers.write']))
    router.delete('/suppliers/:id', [SuppliersController, 'destroy']).use(middleware.permission(['suppliers.write']))

    // Requisitions
    router.get('/requisitions', [RequisitionsController, 'index']).use(middleware.permission(['requisitions.read']))
    router.post('/requisitions', [RequisitionsController, 'store']).use(middleware.permission(['requisitions.write']))
    router.get('/requisitions/:id', [RequisitionsController, 'show']).use(middleware.permission(['requisitions.read']))
    router.post('/requisitions/:id/submit', [RequisitionsController, 'submit']).use(middleware.permission(['requisitions.write']))
    router.post('/requisitions/:id/approve', [RequisitionsController, 'approve']).use(middleware.permission(['requisitions.write']))
    router.post('/requisitions/:id/reject', [RequisitionsController, 'reject']).use(middleware.permission(['requisitions.write']))
    router.post('/requisitions/:id/fulfill', [RequisitionsController, 'fulfill']).use(middleware.permission(['requisitions.write']))

    // COA documents
    router.get('/coa', [CoaController, 'index']).use(middleware.permission(['coa.read']))
    router.post('/coa', [CoaController, 'store']).use(middleware.permission(['coa.write']))
    router.get('/coa/:id', [CoaController, 'show']).use(middleware.permission(['coa.read']))
    router.patch('/coa/:id', [CoaController, 'update']).use(middleware.permission(['coa.write']))
    router.post('/coa/:id/approve', [CoaController, 'approve']).use(middleware.permission(['coa.write']))
    router.get('/coa/:id/export', [CoaController, 'export']).use(middleware.permission(['coa.read']))

    // Physical counts
    router.get('/counts', [PhysicalCountsController, 'index']).use(middleware.permission(['counts.read']))
    router.post('/counts', [PhysicalCountsController, 'store']).use(middleware.permission(['counts.write']))
    router.get('/counts/:id', [PhysicalCountsController, 'show']).use(middleware.permission(['counts.read']))
    router.post('/counts/:id/scan', [PhysicalCountsController, 'scan']).use(middleware.permission(['counts.write']))
    router.post('/counts/:id/reconcile', [PhysicalCountsController, 'reconcile']).use(middleware.permission(['counts.write']))
    router.post('/counts/:id/close', [PhysicalCountsController, 'close']).use(middleware.permission(['counts.write']))

    // Depreciation + property ledger
    router.post('/depreciation/profiles', [DepreciationController, 'createProfile']).use(middleware.permission(['depreciation.write']))
    router.get('/depreciation/profiles/:assetId', [DepreciationController, 'getProfile']).use(middleware.permission(['depreciation.read']))
    router.post('/depreciation/run', [DepreciationController, 'run']).use(middleware.permission(['depreciation.write']))
    router.get('/depreciation/lapsing-schedule', [DepreciationController, 'lapsingSchedule']).use(middleware.permission(['depreciation.read']))
    router.get('/depreciation/property-ledger', [DepreciationController, 'propertyLedger']).use(middleware.permission(['depreciation.read']))

    // Reports
    router.get('/reports/stock-inventory', [ReportsController, 'stockInventory']).use(middleware.permission(['reports.read']))
    router.get('/reports/property-ledger', [ReportsController, 'propertyLedger']).use(middleware.permission(['reports.read']))
    router.get('/reports/consumption', [ReportsController, 'consumption']).use(middleware.permission(['reports.read']))
    router.get('/reports/depreciation', [ReportsController, 'depreciation']).use(middleware.permission(['reports.read']))

    // Assets
    router.get('/assets', [AssetsController, 'index']).use(middleware.permission(['assets.read']))
    router.post('/assets', [AssetsController, 'store']).use(middleware.permission(['assets.write']))
    router.get('/assets/:id', [AssetsController, 'show']).use(middleware.permission(['assets.read']))
    router.patch('/assets/:id', [AssetsController, 'update']).use(middleware.permission(['assets.write']))
    router.delete('/assets/:id', [AssetsController, 'destroy']).use(middleware.permission(['assets.write']))
    router.post('/assets/:id/assign', [AssetsController, 'assign']).use(middleware.permission(['assets.write']))
    router.post('/assets/:id/return', [AssetsController, 'returnAsset']).use(middleware.permission(['assets.write']))
    router.post('/assets/:id/retire', [AssetsController, 'retire']).use(middleware.permission(['assets.write']))
    router.post('/assets/:id/maintenance', [AssetsController, 'scheduleMaintenance']).use(middleware.permission(['assets.write']))
    router.patch('/assets/:id/maintenance/:maintenanceId/complete', [AssetsController, 'completeMaintenance']).use(middleware.permission(['assets.write']))
    router.post('/assets/:id/qr', [AssetsController, 'generateQr']).use(middleware.permission(['assets.write']))

    // Audit logs
    router.get('/audit-logs', [AuditLogsController, 'index']).use(middleware.permission(['audit.read']))
  })
  .prefix('/api/v1/inventory').as('inventory')
  .use(middleware.auth())

const InternalClearanceController = () => import('#modules/inventory/controllers/internal_clearance_controller')
const InternalProcurementAcceptanceController = () =>
  import('#modules/inventory/controllers/internal_procurement_acceptance_controller')

router
  .group(() => {
    router.get('/custodianships', [InternalCustodianshipsController, 'index'])
    router.get('/clearance/:studentNumber', [InternalClearanceController, 'checkClearance'])
    router.post('/procurement/acceptance', [InternalProcurementAcceptanceController, 'accept'])
  })
  .prefix('/api/v1/inventory/internal').as('inventory.internal')
  .use(middleware.serviceApiKey())
