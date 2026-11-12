import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class UlmisIntegrityCheck extends BaseCommand {
  static commandName = 'ulmis:integrity-check'
  static description = 'SQL integrity probes for library circulation (orphan loans, duplicate actives)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const orphanLoans = await db.rawQuery(`
      SELECT b.id
      FROM library.borrowings b
      LEFT JOIN library.members m ON m.id = b.member_id AND m.deleted_at IS NULL
      WHERE m.id IS NULL AND b.status IN ('borrowed', 'overdue')
      LIMIT 20
    `)

    const duplicateActive = await db.rawQuery(`
      SELECT bc.id, bc.book_id, COUNT(*) AS active_loans
      FROM library.borrowings br
      JOIN library.book_copies bc ON bc.id = br.copy_id
      WHERE br.status IN ('borrowed', 'overdue')
      GROUP BY bc.id, bc.book_id
      HAVING COUNT(*) > 1
      LIMIT 20
    `)

    const orphanCount = orphanLoans.rows?.length ?? 0
    const dupCount = duplicateActive.rows?.length ?? 0

    if (orphanCount === 0 && dupCount === 0) {
      this.logger.success('Integrity OK: no orphan active loans, no duplicate active loans on one copy')
      return
    }

    this.logger.warning(`Integrity issues: orphanLoans=${orphanCount}, duplicateActiveCopyLoans=${dupCount}`)
    this.exitCode = 1
  }
}
