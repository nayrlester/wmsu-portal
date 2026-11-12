import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import UlmisIntegrationDispatchService from '#modules/library/services/ulmis/ulmis_integration_dispatch_service'

export default class IntegrationOutboxDispatch extends BaseCommand {
  static commandName = 'integrations:outbox-dispatch'
  static description = 'Dispatch pending ULMIS integration outbox rows (INT-LIB-04/05/06/07)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new UlmisIntegrationDispatchService()
    const result = await service.dispatchPending(50)
    this.logger.success(
      `Outbox dispatch: processed ${result.processed}, sent ${result.sent}, failed ${result.failed}`
    )
  }
}
