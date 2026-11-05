import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/finance/middleware_registry'

const AuthController = () => import('#modules/finance/controllers/auth_controller')
const UfmsController = () => import('#modules/finance/controllers/ufms_controller')
const UfmsReferenceController = () => import('#modules/finance/controllers/ufms_reference_controller')
const CashierController = () => import('#modules/finance/controllers/cashier_controller')
const ProcurementController = () => import('#modules/finance/controllers/procurement_controller')
const InternalClearanceController = () => import('#modules/finance/controllers/internal_clearance_controller')
const InternalCashierController = () => import('#modules/finance/controllers/internal_cashier_controller')
const InternalAssessmentsController = () => import('#modules/finance/controllers/internal_assessments_controller')
const PosController = () => import('#modules/finance/controllers/pos_controller')
const BudgetController = () => import('#modules/finance/controllers/budget_controller')
const AccountingController = () => import('#modules/finance/controllers/accounting_controller')
const DashboardController = () => import('#modules/finance/controllers/dashboard_controller')


router
  .group(() => {
    router.post('/auth/login', [AuthController, 'login'])
      .use(middleware.rateLimit({ max: 10, windowMs: 15 * 60_000, prefix: 'login' }))
    router.post('/auth/refresh', [AuthController, 'refresh'])
      .use(middleware.rateLimit({ max: 30, windowMs: 60_000, prefix: 'refresh' }))
  })
  .prefix('/api/v1/finance').as('finance')

router
  .group(() => {
    router.post('/auth/logout', [AuthController, 'logout'])
    router.get('/auth/me', [AuthController, 'me'])

    router.get('/ufms', [UfmsController, 'info']).use(middleware.permission(['finance.read']))

    router
      .get('/dashboard/summary', [DashboardController, 'summary'])
      .use(middleware.permission(['finance.read']))

    router.get('/coa', [UfmsReferenceController, 'listCoa']).use(middleware.permission(['finance.read']))
    router.post('/coa', [UfmsReferenceController, 'storeCoa']).use(middleware.permission(['finance.write']))
    router
      .put('/coa/:id', [UfmsReferenceController, 'updateCoa'])
      .use(middleware.permission(['finance.write']))

    router.get('/funds', [UfmsReferenceController, 'listFunds']).use(middleware.permission(['finance.read']))
    router.post('/funds', [UfmsReferenceController, 'storeFund']).use(middleware.permission(['finance.write']))

    router.get('/banks', [UfmsReferenceController, 'listBanks']).use(middleware.permission(['finance.read']))
    router.post('/banks', [UfmsReferenceController, 'storeBank']).use(middleware.permission(['finance.write']))

    router
      .get('/bank-accounts', [UfmsReferenceController, 'listBankAccounts'])
      .use(middleware.permission(['finance.read']))
    router
      .post('/bank-accounts', [UfmsReferenceController, 'storeBankAccount'])
      .use(middleware.permission(['finance.write']))

    router
      .get('/fiscal-periods', [UfmsReferenceController, 'listFiscalPeriods'])
      .use(middleware.permission(['finance.read']))
    router
      .post('/fiscal-periods', [UfmsReferenceController, 'storeFiscalPeriod'])
      .use(middleware.permission(['finance.write']))

    router
      .get('/or-series', [UfmsReferenceController, 'listOrSeries'])
      .use(middleware.permission(['finance.read']))
    router
      .post('/or-series', [UfmsReferenceController, 'storeOrSeries'])
      .use(middleware.permission(['finance.write']))

    router
      .get('/approval-workflows', [UfmsReferenceController, 'listApprovalWorkflows'])
      .use(middleware.permission(['finance.read']))
    router
      .post('/approval-workflows', [UfmsReferenceController, 'storeApprovalWorkflow'])
      .use(middleware.permission(['finance.write']))

    router.get('/budget/plans', [BudgetController, 'listPlans']).use(middleware.permission(['budget.read']))
    router.post('/budget/plans', [BudgetController, 'storePlan']).use(middleware.permission(['budget.write']))
    router.get('/budget/plans/:id', [BudgetController, 'showPlan']).use(middleware.permission(['budget.read']))
    router.put('/budget/plans/:id', [BudgetController, 'updatePlan']).use(middleware.permission(['budget.write']))
    router.post('/budget/plans/:id/submit', [BudgetController, 'submitPlan']).use(middleware.permission(['budget.submit']))
    router.post('/budget/plans/:id/approve', [BudgetController, 'approvePlan']).use(middleware.permission(['budget.approve']))
    router.post('/budget/plans/:id/reject', [BudgetController, 'rejectPlan']).use(middleware.permission(['budget.approve']))
    router.post('/budget/plans/:id/revise', [BudgetController, 'revisePlan']).use(middleware.permission(['budget.write']))

    router.get('/budget/documents', [BudgetController, 'listDocuments']).use(middleware.permission(['budget.read']))
    router.post('/budget/documents', [BudgetController, 'storeDocument']).use(middleware.permission(['budget.write']))
    router.get('/budget/documents/:id', [BudgetController, 'showDocument']).use(middleware.permission(['budget.read']))
    router
      .post('/budget/documents/:id/submit', [BudgetController, 'submitDocument'])
      .use(middleware.permission(['budget.submit']))
    router
      .post('/budget/documents/:id/approve', [BudgetController, 'approveDocument'])
      .use(middleware.permission(['budget.approve']))
    router
      .post('/budget/documents/:id/reject', [BudgetController, 'rejectDocument'])
      .use(middleware.permission(['budget.approve']))
    router
      .post('/budget/documents/:id/revise', [BudgetController, 'reviseDocument'])
      .use(middleware.permission(['budget.write']))

    router
      .get('/budget/obligations', [BudgetController, 'listObligations'])
      .use(middleware.permission(['budget.read']))
    router
      .post('/budget/obligations', [BudgetController, 'storeObligation'])
      .use(middleware.permission(['budget.write']))
    router
      .get('/budget/obligations/:id', [BudgetController, 'showObligation'])
      .use(middleware.permission(['budget.read']))
    router
      .post('/budget/obligations/:id/post', [BudgetController, 'postObligation'])
      .use(middleware.permission(['budget.approve']))
    router
      .post('/budget/obligations/:id/cancel', [BudgetController, 'cancelObligation'])
      .use(middleware.permission(['budget.approve']))

    router.get('/budget/monitor', [BudgetController, 'monitor']).use(middleware.permission(['budget.read']))
    router
      .post('/budget/validate-availability', [BudgetController, 'validateAvailability'])
      .use(middleware.permission(['budget.read']))

    router
      .get('/accounting/journals', [AccountingController, 'listJournals'])
      .use(middleware.permission(['accounting.read']))
    router
      .post('/accounting/journals', [AccountingController, 'storeJournal'])
      .use(middleware.permission(['accounting.write']))
    router
      .get('/accounting/journals/:id', [AccountingController, 'showJournal'])
      .use(middleware.permission(['accounting.read']))
    router
      .post('/accounting/journals/:id/submit', [AccountingController, 'submitJournal'])
      .use(middleware.permission(['accounting.write']))
    router
      .post('/accounting/journals/:id/post', [AccountingController, 'postJournal'])
      .use(middleware.permission(['accounting.post']))
    router
      .post('/accounting/journals/:id/revise', [AccountingController, 'reviseJournal'])
      .use(middleware.permission(['accounting.write']))
    router
      .get('/accounting/ledger', [AccountingController, 'listLedger'])
      .use(middleware.permission(['accounting.read']))
    router
      .get('/accounting/trial-balance', [AccountingController, 'trialBalance'])
      .use(middleware.permission(['accounting.read']))
    router
      .get('/accounting/cash-flow', [AccountingController, 'cashFlow'])
      .use(middleware.permission(['accounting.read']))
    router
      .post('/accounting/fiscal-periods/:id/close', [AccountingController, 'closePeriod'])
      .use(middleware.permission(['accounting.close_period']))
    router
      .post('/accounting/fiscal-periods/:id/reopen', [AccountingController, 'reopenPeriod'])
      .use(middleware.permission(['accounting.close_period']))
    router
      .get('/accounting/tax-rates', [AccountingController, 'listTaxRates'])
      .use(middleware.permission(['accounting.read']))
    router
      .post('/accounting/tax-rates', [AccountingController, 'storeTaxRate'])
      .use(middleware.permission(['accounting.write']))
    router
      .post('/accounting/tax-entries', [AccountingController, 'storeTaxEntry'])
      .use(middleware.permission(['accounting.write']))
    router
      .get('/accounting/tax-remittance', [AccountingController, 'remittanceReport'])
      .use(middleware.permission(['accounting.read']))
    router
      .post('/accounting/tax-remittance/mark', [AccountingController, 'markRemitted'])
      .use(middleware.permission(['accounting.post']))
    router
      .get('/accounting/bank-reconciliations', [AccountingController, 'listReconciliations'])
      .use(middleware.permission(['accounting.read']))
    router
      .post('/accounting/bank-reconciliations', [AccountingController, 'storeReconciliation'])
      .use(middleware.permission(['accounting.write']))
    router
      .post('/accounting/bank-reconciliations/:id/complete', [AccountingController, 'completeReconciliation'])
      .use(middleware.permission(['accounting.post']))

    router.post('/cashier/payments', [CashierController, 'recordPayment']).use(middleware.permission(['cashier.write']))
    router.get('/cashier/payments', [CashierController, 'listPayments']).use(middleware.permission(['cashier.read']))

    router
      .get('/procurement/vendors', [ProcurementController, 'listVendors'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/vendors', [ProcurementController, 'storeVendor'])
      .use(middleware.permission(['procurement.write']))
    router
      .put('/procurement/vendors/:id', [ProcurementController, 'updateVendor'])
      .use(middleware.permission(['procurement.write']))

    router
      .get('/procurement/requisitions', [ProcurementController, 'listRequisitions'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/requisitions', [ProcurementController, 'storeRequisition'])
      .use(middleware.permission(['procurement.write']))
    router
      .get('/procurement/requisitions/:id', [ProcurementController, 'showRequisition'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/requisitions/:id/submit', [ProcurementController, 'submitRequisition'])
      .use(middleware.permission(['procurement.write']))
    router
      .post('/procurement/requisitions/:id/approve', [ProcurementController, 'approveRequisition'])
      .use(middleware.permission(['procurement.approve']))
    router
      .post('/procurement/requisitions/:id/reject', [ProcurementController, 'rejectRequisition'])
      .use(middleware.permission(['procurement.approve']))

    router
      .get('/procurement/rfqs', [ProcurementController, 'listRfqs'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/rfqs', [ProcurementController, 'storeRfq'])
      .use(middleware.permission(['procurement.write']))
    router
      .post('/procurement/rfqs/:id/issue', [ProcurementController, 'issueRfq'])
      .use(middleware.permission(['procurement.write']))
    router
      .post('/procurement/rfqs/:id/close', [ProcurementController, 'closeRfq'])
      .use(middleware.permission(['procurement.write']))

    router
      .post('/procurement/quotations', [ProcurementController, 'storeQuotation'])
      .use(middleware.permission(['procurement.write']))
    router
      .post('/procurement/abstracts', [ProcurementController, 'storeAbstract'])
      .use(middleware.permission(['procurement.write']))
    router
      .post('/procurement/awards', [ProcurementController, 'storeAward'])
      .use(middleware.permission(['procurement.approve']))

    router
      .get('/procurement/orders', [ProcurementController, 'listPurchaseOrders'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/orders', [ProcurementController, 'storePurchaseOrder'])
      .use(middleware.permission(['procurement.write']))
    router
      .get('/procurement/orders/:id', [ProcurementController, 'showPurchaseOrder'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/orders/:id/approve', [ProcurementController, 'approvePurchaseOrder'])
      .use(middleware.permission(['procurement.approve']))
    router
      .post('/procurement/orders/:id/issue', [ProcurementController, 'issuePurchaseOrder'])
      .use(middleware.permission(['procurement.write']))

    router.post('/procurement/po', [ProcurementController, 'createPurchaseOrder'])
      .use(middleware.permission(['procurement.write']))
      .as('finance.procurement.createPurchaseOrder')

    router
      .post('/procurement/deliveries', [ProcurementController, 'storeDelivery'])
      .use(middleware.permission(['procurement.write']))
    router
      .get('/procurement/iars', [ProcurementController, 'listIars'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/iars', [ProcurementController, 'storeIar'])
      .use(middleware.permission(['procurement.accept']))

    router
      .get('/procurement/monitor', [ProcurementController, 'monitor'])
      .use(middleware.permission(['procurement.read']))
    router
      .get('/procurement/documents', [ProcurementController, 'listDocumentRefs'])
      .use(middleware.permission(['procurement.read']))
    router
      .post('/procurement/documents', [ProcurementController, 'storeDocumentRef'])
      .use(middleware.permission(['procurement.write']))

    router
      .get('/pos/terminals', [PosController, 'listTerminals'])
      .use(middleware.permission(['pos.read']))
    router
      .post('/pos/terminals', [PosController, 'storeTerminal'])
      .use(middleware.permission(['pos.write']))
    router
      .put('/pos/terminals/:id', [PosController, 'updateTerminal'])
      .use(middleware.permission(['pos.write']))

    router
      .get('/pos/catalog', [PosController, 'listCatalog'])
      .use(middleware.permission(['pos.read']))
    router
      .post('/pos/catalog', [PosController, 'storeCatalogItem'])
      .use(middleware.permission(['pos.write']))
    router
      .put('/pos/catalog/:id', [PosController, 'updateCatalogItem'])
      .use(middleware.permission(['pos.write']))

    router
      .get('/pos/sales', [PosController, 'listSales'])
      .use(middleware.permission(['pos.read']))
    router
      .post('/pos/sales', [PosController, 'storeSale'])
      .use(middleware.permission(['pos.write']))
    router
      .get('/pos/sales/:id', [PosController, 'showSale'])
      .use(middleware.permission(['pos.read']))
    router
      .post('/pos/sales/:id/complete', [PosController, 'completeSale'])
      .use(middleware.permission(['pos.sell']))
    router
      .post('/pos/sales/:id/void', [PosController, 'voidSale'])
      .use(middleware.permission(['pos.void']))

    router
      .post('/pos/eod', [PosController, 'closeEod'])
      .use(middleware.permission(['pos.close_day']))
    router
      .get('/pos/reports/cashier', [PosController, 'cashierReport'])
      .use(middleware.permission(['pos.read']))

    router
      .get('/pos/stock-snapshots', [PosController, 'listStockSnapshots'])
      .use(middleware.permission(['pos.read']))
    router
      .put('/pos/stock-snapshots', [PosController, 'upsertStockSnapshot'])
      .use(middleware.permission(['pos.write']))

    router
      .post('/pos/sales/legacy', [PosController, 'recordSale'])
      .use(middleware.permission(['pos.sell']))
      .as('pos.record_sale')
  })
  .prefix('/api/v1/finance').as('finance')
  .use(middleware.auth())


router
  .group(() => {
    router.get('/clearance/:studentNumber', [InternalClearanceController, 'checkClearance'])
    router.post('/cashier/payments', [InternalCashierController, 'recordPayment'])
    router.post('/assessments', [InternalAssessmentsController, 'upsert'])
    router.get('/assessments/:assessmentNumber/payment-status', [InternalAssessmentsController, 'paymentStatus'])
    router
      .post('/procurement/po', [ProcurementController, 'createPurchaseOrder'])
      .as('internal.procurement.createPurchaseOrder')
  })
  .prefix('/api/v1/finance/internal').as('finance.internal')
  .use(middleware.serviceApiKey())
