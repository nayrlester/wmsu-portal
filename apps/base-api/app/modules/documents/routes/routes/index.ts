/*
|--------------------------------------------------------------------------
| Route registry — domain-segregated API routing
|--------------------------------------------------------------------------
|
| Each folder under start/routes/ owns one API surface. Import order
| mirrors the original monolithic start/routes.ts registration.
|
*/

import { registerInfrastructureRoutes } from './infrastructure.js'
import { registerPublicRoutes } from './public.js'
import { registerBillingWebhookRoutes } from './webhooks/billing.js'
import { registerPandadocWebhookRoutes } from './webhooks/pandadoc.js'
import { registerV1Routes } from './v1/index.js'
import { registerDocumentsHubRoutes } from './v1/documents_hub.js'

registerInfrastructureRoutes()
registerPublicRoutes()
registerBillingWebhookRoutes()
registerPandadocWebhookRoutes()
registerDocumentsHubRoutes()
registerV1Routes()
