import type { ApplicationService } from '@adonisjs/core/types'
import { socketService } from '#infrastructure/realtime/socket_service'

export default class RealtimeProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.getEnvironment() === 'console') {
      return
    }

    this.app.ready(async () => {
      await socketService.boot()
    })

    this.app.terminating(async () => {
      await socketService.shutdown()
    })
  }
}
