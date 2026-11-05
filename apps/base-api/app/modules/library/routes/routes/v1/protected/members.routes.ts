import router from '@adonisjs/core/services/router'

const MembersController = () => import('#modules/library/controllers/members_controller')

export function registerMemberRoutes() {
  router.get('members/pending', [MembersController, 'pending'])
  router.get('members', [MembersController, 'index'])
  router.post('members', [MembersController, 'store'])
  router.get('members/:id', [MembersController, 'show'])
  router.patch('members/:id', [MembersController, 'update'])
  router.delete('members/:id', [MembersController, 'destroy'])
  router.post('members/:id/approve', [MembersController, 'approve'])
  router.post('members/:id/reject', [MembersController, 'reject'])
  router.get('members/:id/card', [MembersController, 'card'])
  router.get('members/:id/borrowing-history', [MembersController, 'borrowingHistory'])
}
