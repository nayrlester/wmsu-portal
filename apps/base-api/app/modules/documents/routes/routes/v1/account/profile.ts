import router from '@adonisjs/core/services/router'

const AuthController = () => import('#modules/documents/controllers/auth_controller')

export function registerAccountProfileRoutes() {
  router.get('profile', [AuthController, 'profile'])
  router.post('logout', [AuthController, 'logout'])
}
