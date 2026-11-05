import router from '@adonisjs/core/services/router'

const AuthController = () => import('#modules/library/controllers/auth_controller')

export function registerAuthRoutes() {
  router.get('auth/me', [AuthController, 'me'])
  router.post('auth/logout', [AuthController, 'logout'])
}
