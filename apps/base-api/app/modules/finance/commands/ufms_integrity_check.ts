import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class UfmsIntegrityCheck extends BaseCommand {
  static commandName = 'ufms:integrity-check'
  static description = 'SQL integrity probes for finance (unbalanced JEs, orphan obligations)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const unbalanced = await db.rawQuery(`
      SELECT j.id, j.entry_number,
             SUM(jl.debit_amount) AS debit_total,
             SUM(jl.credit_amount) AS credit_total
      FROM finance.journal_entries j
      JOIN finance.journal_entry_lines jl ON jl.journal_entry_id = j.id
      WHERE j.status = 'posted'
      GROUP BY j.id, j.entry_number
      HAVING ABS(SUM(jl.debit_amount) - SUM(jl.credit_amount)) > 0.01
      LIMIT 20
    `)

    const orphanObligations = await db.rawQuery(`
      SELECT o.id
      FROM finance.budget_obligations o
      LEFT JOIN finance.budget_lines bl ON bl.id = o.budget_line_id
      WHERE o.budget_line_id IS NOT NULL AND bl.id IS NULL
        AND o.status NOT IN ('cancelled', 'rejected')
      LIMIT 20
    `)

    const unbalancedCount = unbalanced.rows?.length ?? 0
    const orphanCount = orphanObligations.rows?.length ?? 0

    if (unbalancedCount === 0 && orphanCount === 0) {
      this.logger.success('Integrity OK: no unbalanced posted journals, no orphan active obligations')
      return
    }

    this.logger.warning(`Integrity issues: unbalancedJournals=${unbalancedCount}, orphanObligations=${orphanCount}`)
    this.exitCode = 1
  }
}
