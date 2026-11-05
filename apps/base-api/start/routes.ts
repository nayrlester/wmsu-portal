import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { registerEnrollmentRoutes } from '../app/modules/enrollment/register_routes.js'
import { registerFinanceRoutes } from '../app/modules/finance/register_routes.js'
import { registerRecordsRoutes } from '../app/modules/records/register_routes.js'
import { registerLibraryRoutes } from '../app/modules/library/register_routes.js'
import { registerDocumentsRoutes } from '../app/modules/documents/register_routes.js'
import { registerInventoryRoutes } from '../app/modules/inventory/register_routes.js'

const HealthController = () => import('#controllers/health_controller')
const MdmController = () => import('#controllers/mdm_controller')
const IntegrationController = () => import('#controllers/integration_controller')
const GatewayController = () => import('#controllers/gateway_controller')
const CommonPlatformController = () => import('#controllers/common_platform_controller')
const ModuleStatusController = () => import('#controllers/module_status_controller')

router.get('/', async () => {
  return {
    success: true,
    message: 'WMSU CIS Platform API',
    data: {
      docs: '/api/v1/docs',
      health: '/api/v1/health',
      mdm: '/api/v1/mdm/overview',
      integration: '/api/v1/integration/overview',
      openapi: '/api/v1/openapi.json',
      commonPlatform: '/api/v1/platform/status',
      launcher: '/api/v1/platform/launcher',
      enrollment: '/api/v1/enrollment/_status',
      finance: '/api/v1/finance/_status',
      records: '/api/v1/records/_status',
      library: '/api/v1/library/_status',
      documents: '/api/v1/documents/_status',
      inventory: '/api/v1/inventory/_status',
      dbConsolidation: '/api/v1/platform/db-consolidation',
      jwks: '/.well-known/jwks.json',
      gateway: '/api/v1/gateway',
      mode: 'modular-monolith-in-process',
    },
  }
})

router.get('/.well-known/jwks.json', [CommonPlatformController, 'jwks'])

router
  .group(() => {
    router.get('/health/live', [HealthController, 'live'])
    router.get('/health', [HealthController, 'show'])
    router.get('/ping', [HealthController, 'ping'])
    router.get('/openapi.json', async ({ response }) => {
      const { openApiDocument } = await import('#services/openapi_document')
      return response.ok(openApiDocument)
    })
    router.get('/docs', async ({ response }) => {
      const html = `<!doctype html>
<html>
  <head>
    <title>WMSU CIS API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui'
      })
    </script>
  </body>
</html>`
      return response.header('Content-Type', 'text/html').send(html)
    })

    router
      .group(() => {
        router.get('/overview', [MdmController, 'overview'])
        router.get('/universities', [MdmController, 'listUniversities'])
        router.get('/campuses', [MdmController, 'listCampuses'])
        router.get('/colleges', [MdmController, 'listColleges'])
        router.get('/departments', [MdmController, 'listDepartments'])
        router.get('/offices', [MdmController, 'listOffices'])
        router.get('/academic-years', [MdmController, 'listAcademicYears'])
        router.get('/terms', [MdmController, 'listTerms'])
        router.get('/employees', [MdmController, 'listEmployees'])
        router.get('/student-identity-refs', [MdmController, 'listStudentIdentityRefs'])
        router.get('/countries', [MdmController, 'listCountries'])
        router.get('/regions', [MdmController, 'listRegions'])
        router.get('/addresses', [MdmController, 'listAddresses'])
        router.get('/number-sequences', [MdmController, 'listSequences'])
        router.get('/settings', [MdmController, 'listSettings'])
        router.get('/audit-logs', [MdmController, 'listAuditLogs'])
      })
      .prefix('/mdm')

    router
      .group(() => {
        router.post('/universities', [MdmController, 'createUniversity'])
        router.post('/campuses', [MdmController, 'createCampus'])
        router.post('/student-identity-refs', [MdmController, 'upsertStudentIdentityRef'])
        router.post('/number-sequences/:id/next', [MdmController, 'nextSequenceValue'])
        router.post('/settings', [MdmController, 'upsertSetting'])
      })
      .prefix('/mdm')
      .use(middleware.mdmAdmin())

    router.get('/integration/overview', [IntegrationController, 'overview'])
    router.get('/integration/clearance/types', [IntegrationController, 'listClearanceTypes'])
    router.get('/integration/clearance/:subjectKey', [IntegrationController, 'getClearance'])
    router.get('/integration/audit-logs', [IntegrationController, 'listAuditLogs'])

    router
      .group(() => {
        router.post('/events', [IntegrationController, 'publishEvent'])
        router.get('/events', [IntegrationController, 'listEvents'])
        router.get('/subscriptions', [IntegrationController, 'listSubscriptions'])
        router.get('/transactions', [IntegrationController, 'listTransactions'])
        router.post('/notifications', [IntegrationController, 'enqueueNotification'])
        router.get('/notifications', [IntegrationController, 'listNotifications'])
        router.post('/files', [IntegrationController, 'uploadFile'])
        router.get('/files/:id', [IntegrationController, 'getFileMeta'])
        router.post('/clearance/requirements', [IntegrationController, 'upsertClearanceRequirement'])
        router.post('/critical/echo', [IntegrationController, 'criticalEcho'])
      })
      .prefix('/integration')
      .use(middleware.serviceApiKey())

    router.get('/gateway', [GatewayController, 'catalog'])
    router.any('/gateway/:system/*', [GatewayController, 'proxy'])

    router.get('/platform/status', [CommonPlatformController, 'status'])
    router.get('/platform/launcher', [CommonPlatformController, 'launcher'])
    router.get('/platform/db-consolidation', [CommonPlatformController, 'dbConsolidation'])
    router.any('/auth/*', [CommonPlatformController, 'auth'])
    router.any('/admin/*', [CommonPlatformController, 'admin'])
    router.any('/integrations/*', [CommonPlatformController, 'integrations'])

    for (const moduleName of [
      'enrollment',
      'finance',
      'records',
      'library',
      'documents',
      'inventory',
    ] as const) {
      router.get(`/${moduleName}/_status`, [ModuleStatusController, 'status']).as(`${moduleName}.status`)
      router.get(`/${moduleName}/_health`, [ModuleStatusController, 'health']).as(`${moduleName}.health`)
    }
  })
  .prefix('/api/v1')

await registerEnrollmentRoutes()
await registerFinanceRoutes()
await registerRecordsRoutes()
await registerLibraryRoutes()
await registerDocumentsRoutes()
await registerInventoryRoutes()
