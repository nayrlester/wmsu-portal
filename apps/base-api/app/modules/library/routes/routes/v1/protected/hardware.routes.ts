import router from '@adonisjs/core/services/router'

const HardwareController = () => import('#modules/library/controllers/hardware_controller')

export function registerHardwareRoutes() {
  router.get('hardware/rfid', [HardwareController, 'listRfid'])
  router.post('hardware/rfid', [HardwareController, 'registerRfid'])
  router.post('hardware/rfid/checkout', [HardwareController, 'rfidCheckout'])

  router.get('hardware/kiosks', [HardwareController, 'listKiosks'])
  router.get('hardware/kiosks/transactions', [HardwareController, 'listKioskTransactions'])
  router.post('hardware/kiosks', [HardwareController, 'upsertKiosk'])
  router.patch('hardware/kiosks/:id', [HardwareController, 'setKioskEnabled'])
  router.post('hardware/kiosks/:id/rotate-key', [HardwareController, 'rotateKioskKey'])

  router.post('hardware/queue/tickets', [HardwareController, 'issueTicket'])
  router.post('hardware/queue/call-next', [HardwareController, 'callNext'])
  router.get('hardware/queue/board', [HardwareController, 'queueBoard']).as('hardware.queue_board')

  router.get('hardware/locations', [HardwareController, 'listLocations'])
  router.post('hardware/locations', [HardwareController, 'upsertLocation'])
  router.get('hardware/locate', [HardwareController, 'locate'])
}
