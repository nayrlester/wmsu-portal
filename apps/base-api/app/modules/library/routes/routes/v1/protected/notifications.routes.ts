import router from '@adonisjs/core/services/router'

const NotificationsController = () => import('#modules/library/controllers/notifications_controller')

export function registerNotificationRoutes() {
  router.get('notifications/delivery-log', [NotificationsController, 'deliveryLog'])
  router.get('notifications', [NotificationsController, 'index'])
  router.get('notifications/unread-count', [NotificationsController, 'unreadCount'])
  router.post('notifications/read-all', [NotificationsController, 'markAllRead'])
  router.post('notifications/:id/read', [NotificationsController, 'markRead'])
  router.get('notifications/preferences', [NotificationsController, 'preferences'])
  router.patch('notifications/preferences', [NotificationsController, 'updatePreference'])
}
