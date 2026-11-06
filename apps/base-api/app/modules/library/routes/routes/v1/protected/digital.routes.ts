import router from '@adonisjs/core/services/router'

const DigitalController = () => import('#modules/library/controllers/digital_controller')

export function registerDigitalRoutes() {
  router.get('digital/repository', [DigitalController, 'listRepository'])
  router.post('digital/repository', [DigitalController, 'createRepository'])
  router.post('digital/repository/:id/access', [DigitalController, 'accessRepository'])
  router.get('digital/eresources', [DigitalController, 'listElectronic'])
  router.post('digital/eresources', [DigitalController, 'createElectronic'])
  router.post('digital/eresources/:id/open', [DigitalController, 'openElectronic'])
  router.get('digital/search', [DigitalController, 'unifiedSearch'])
}
