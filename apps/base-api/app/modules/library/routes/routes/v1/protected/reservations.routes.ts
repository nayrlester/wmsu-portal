import router from '@adonisjs/core/services/router'

const ReservationsController = () => import('#modules/library/controllers/reservations_controller')

export function registerReservationRoutes() {
  router.get('reservations', [ReservationsController, 'index'])
  router.post('reservations', [ReservationsController, 'store'])
  router.post('reservations/:id/cancel', [ReservationsController, 'cancel'])
  router.post('reservations/:id/fulfill', [ReservationsController, 'fulfill'])
}
