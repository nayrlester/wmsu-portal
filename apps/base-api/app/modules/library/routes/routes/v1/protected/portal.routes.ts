import router from '@adonisjs/core/services/router'

const PortalController = () => import('#modules/library/controllers/portal_controller')

export function registerPortalRoutes() {
  router.get('portal/me', [PortalController, 'me'])
  router.get('portal/card', [PortalController, 'card'])
  router.get('portal/notices', [PortalController, 'notices'])
  router.post('portal/notices/:id/read', [PortalController, 'readNotice'])
  router.post('portal/loans/:id/renew', [PortalController, 'renew'])
  router.post('portal/reservations', [PortalController, 'reserve'])
  router.post('portal/reservations/:id/cancel', [PortalController, 'cancelReservation'])
  router.get('portal/reading-lists', [PortalController, 'readingLists'])
  router.post('portal/reading-lists', [PortalController, 'createReadingList'])
  router.delete('portal/reading-lists/:id', [PortalController, 'deleteReadingList'])
  router.post('portal/reading-lists/:id/items', [PortalController, 'addReadingListItem'])
  router.delete('portal/reading-lists/:id/items/:itemId', [PortalController, 'removeReadingListItem'])
  router.post('portal/acquisition-requests', [PortalController, 'requestAcquisition'])
}
