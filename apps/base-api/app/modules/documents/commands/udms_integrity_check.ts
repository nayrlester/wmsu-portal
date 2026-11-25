import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class UdmsIntegrityCheck extends BaseCommand {
  static commandName = 'udms:integrity-check'
  static description = 'SQL integrity probes for UDMS (orphan versions, disposal without approval)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const orphanVersions = await db.rawQuery(`
      SELECT dv.id
      FROM documents.document_versions dv
      LEFT JOIN documents.documents d ON d.id = dv.document_id AND d.deleted_at IS NULL
      WHERE d.id IS NULL
      LIMIT 20
    `)

    const disposalWithoutApproval = await db.rawQuery(`
      SELECT dr.id
      FROM documents.disposal_requests dr
      WHERE dr.status IN ('executed', 'disposed', 'completed')
        AND dr.approved_at IS NULL
      LIMIT 20
    `)

    const stuckAssignments = await db.rawQuery(`
      SELECT doc.id
      FROM documents.documents doc
      WHERE doc.assigned_to_id IS NOT NULL
        AND doc.status IN ('approved', 'archived', 'disposed')
        AND doc.deleted_at IS NULL
      LIMIT 20
    `)

    const orphanCount = orphanVersions.rows?.length ?? 0
    const disposalCount = disposalWithoutApproval.rows?.length ?? 0
    const stuckCount = stuckAssignments.rows?.length ?? 0

    if (orphanCount === 0 && disposalCount === 0 && stuckCount === 0) {
      this.logger.success(
        'Integrity OK: no orphan versions, no executed disposals without approval, no stale assignments on terminal docs'
      )
      return
    }

    this.logger.warning(
      `Integrity issues: orphanVersions=${orphanCount}, disposalWithoutApproval=${disposalCount}, staleAssignments=${stuckCount}`
    )
    this.exitCode = 1
  }
}
