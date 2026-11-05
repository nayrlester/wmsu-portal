import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const DigitizationController = () => import('#modules/documents/controllers/digitization_controller')
const ReceivingController = () => import('#modules/documents/controllers/receiving_controller')

const digitize = () => middleware.permission(['records.digitization.manage'])
const receive = () => middleware.permission(['records.receiving.manage'])

export function registerAccountDigitizationReceivingRoutes() {
  router.get('digitization/batches', [DigitizationController, 'index']).use(digitize())
  router.post('digitization/batches', [DigitizationController, 'store']).use(digitize())
  router.get('digitization/batches/:id', [DigitizationController, 'show']).use(digitize())
  router.post('digitization/batches/:id/items', [DigitizationController, 'addItem']).use(digitize())
  router
    .post('digitization/batches/:id/items/:itemId/ingest', [DigitizationController, 'ingest'])
    .use(digitize())
  router
    .post('digitization/batches/:id/items/:itemId/ocr', [DigitizationController, 'runOcr'])
    .use(digitize())

  router
    .post('digitization/batches/:id/items/:itemId/qa', [DigitizationController, 'submitQa'])
    .use(digitize())
  router.post('digitization/batches/:id/complete', [DigitizationController, 'complete']).use(digitize())

  router.get('receiving/receipts', [ReceivingController, 'index']).use(receive())
  router.post('receiving/receipts', [ReceivingController, 'store']).use(receive())
  router.get('receiving/receipts/:id', [ReceivingController, 'show']).use(receive())
  router
    .post('receiving/receipts/:id/register', [ReceivingController, 'register'])
    .use(receive())
  router
    .get('receiving/receipts/:id/acknowledgment', [ReceivingController, 'acknowledgment'])
    .use(receive())
}
