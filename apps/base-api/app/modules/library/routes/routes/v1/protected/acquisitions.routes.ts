import router from '@adonisjs/core/services/router'
import AcquisitionsController from '#modules/library/controllers/acquisitions_controller'

export function registerAcquisitionRoutes() {
  router.get('acquisitions/dashboard', [AcquisitionsController, 'dashboard'])
  router.get('acquisitions', [AcquisitionsController, 'index'])
  router.post('acquisitions', [AcquisitionsController, 'store'])
  router.get('acquisitions/:id', [AcquisitionsController, 'show'])
  router.patch('acquisitions/:id', [AcquisitionsController, 'update'])
  router.post('acquisitions/:id/submit', [AcquisitionsController, 'submit'])
  router.post('acquisitions/:id/route', [AcquisitionsController, 'route'])
  router.post('acquisitions/:id/acknowledge', [AcquisitionsController, 'acknowledge'])
  router.post('acquisitions/:id/link-catalog', [AcquisitionsController, 'linkCatalog'])
  router.post('acquisitions/:id/cancel', [AcquisitionsController, 'cancel'])
}
