import router from '@adonisjs/core/services/router'

const InternalClearanceController = () => import('#modules/library/controllers/internal_clearance_controller')

export function registerInternalRoutes() {
  router.get('/clearance/:studentNumber', [InternalClearanceController, 'checkClearance'])
}
