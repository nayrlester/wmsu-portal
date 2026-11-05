import router from '@adonisjs/core/services/router'

const NotificationsController = () => import('#modules/documents/controllers/notifications_controller')
const PushTokensController = () => import('#modules/documents/controllers/push_tokens_controller')

export function registerAccountNotificationRoutes() {
  router.get('notifications', [NotificationsController, 'index'])
  router.get('notifications/unread-count', [NotificationsController, 'unreadCount'])
  router.post('notifications/read-all', [NotificationsController, 'markAllRead'])
  router.patch('notifications/:id/read', [NotificationsController, 'markRead'])

  router.post('push-tokens', [PushTokensController, 'store'])
  router.delete('push-tokens', [PushTokensController, 'destroy'])
}
