import router from '@adonisjs/core/services/router'

const UsersController = () => import('#modules/library/controllers/users_controller')

export function registerUserRoutes() {
  router.get('users', [UsersController, 'index'])
  router.get('users/:id', [UsersController, 'show'])
  router.post('users', [UsersController, 'store'])
  router.patch('users/:id', [UsersController, 'update'])
}
