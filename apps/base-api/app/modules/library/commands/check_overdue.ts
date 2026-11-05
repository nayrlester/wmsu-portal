import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import BorrowingService from '#modules/library/services/borrowing/borrowing_service'

export default class CheckOverdue extends BaseCommand {
  static commandName = 'borrowings:check-overdue'
  static description = 'Mark overdue borrowings and trigger notifications'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new BorrowingService()
    const result = await service.processOverdueBorrowings()
    this.logger.success(`Processed ${result.processed} overdue borrowing(s)`)
  }
}
