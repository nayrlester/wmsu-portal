import router from '@adonisjs/core/services/router'

const FinesController = () => import('#modules/library/controllers/fines_controller')

export function registerFineRoutes() {
  router.get('fines/summary', [FinesController, 'summary'])
  router.get('fines', [FinesController, 'index'])
  router.post('fines', [FinesController, 'store'])
  router.get('fines/:id', [FinesController, 'show'])
  router.patch('fines/:id', [FinesController, 'adjust'])
  router.post('fines/:id/waive', [FinesController, 'waive'])
  router.post('fines/:id/collect', [FinesController, 'collect'])
  router.get('fines/:id/payments', [FinesController, 'payments'])
}
