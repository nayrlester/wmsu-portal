import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { slaService } from '#modules/documents/services/sla_service'

export default class SlaCheck extends BaseCommand {
  static commandName = 'sla:check'
  static description = 'Check documents for SLA breaches and dispatch notifications'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const count = await slaService.checkBreaches()
    this.logger.info(`Processed ${count} SLA breach(es)`)
  }
}
