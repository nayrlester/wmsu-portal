import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/library/middleware_registry'

const KioskController = () => import('#modules/library/controllers/kiosk_controller')

export function registerKioskRoutes() {
  router
    .group(() => {
      router.get('kiosk/session', [KioskController, 'session'])
      router.post('kiosk/heartbeat', [KioskController, 'heartbeat'])
      router.get('kiosk/patron', [KioskController, 'patron'])
      router.get('kiosk/account', [KioskController, 'account'])
      router.get('kiosk/history', [KioskController, 'history'])
      router.post('kiosk/checkout', [KioskController, 'checkout'])
      router.post('kiosk/return', [KioskController, 'returnItem'])
    })
    .use(middleware.tenant())
    .use(middleware.kiosk())
}
