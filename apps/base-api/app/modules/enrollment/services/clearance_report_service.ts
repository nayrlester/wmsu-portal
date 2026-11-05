import { createHash, randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import Student from '#modules/enrollment/models/student'
import UsisClearanceReport from '#modules/enrollment/models/usis_clearance_report'
import { clearanceAggregateService } from '#modules/enrollment/services/clearance_aggregate_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

function canonicalChecksum(snapshot: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

function publicWebBase() {
  return (env.get('ENROLLMENT_WEB_URL') ?? 'http://127.0.0.1:5180').replace(/\/$/, '')
}

export class ClearanceReportService {
  verifyUrl(documentToken: string) {
    return `${publicWebBase()}/clearance/verify/${documentToken}`
  }

  async issue(input: {
    organizationId: string
    student: Student
    issuedByUserId: string | null
  }) {
    const snapshot = await clearanceAggregateService.buildSnapshot(input.student)
    const checksum = canonicalChecksum(snapshot as unknown as Record<string, unknown>)
    const documentToken = randomUUID()
    const row = await UsisClearanceReport.create({
      organizationId: input.organizationId,
      studentId: input.student.id,
      studentNumber: input.student.studentNumber,
      documentToken,
      snapshotChecksum: checksum,
      snapshotJson: snapshot,
      cleared: snapshot.cleared,
      issuedBy: input.issuedByUserId,
      issuedAt: DateTime.now(),
      revokedAt: null,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.issuedByUserId,
      action: AuditAction.CREATE,
      entityType: 'clearance_report',
      entityId: row.id,
    })

    return {
      reportId: row.id,
      documentToken,
      snapshotChecksum: checksum,
      verifyUrl: this.verifyUrl(documentToken),
      issuedAt: row.issuedAt.toISO(),
      cleared: row.cleared,
      snapshot,
    }
  }

  async verify(documentToken: string) {
    const row = await UsisClearanceReport.query().where('document_token', documentToken).first()
    if (!row || row.revokedAt) {
      return { valid: false as const, reason: 'not_found' as const }
    }
    const liveChecksum = canonicalChecksum(row.snapshotJson as unknown as Record<string, unknown>)
    const checksumOk = liveChecksum === row.snapshotChecksum
    return {
      valid: checksumOk,
      documentToken: row.documentToken,
      snapshotChecksum: row.snapshotChecksum,
      checksumMatches: checksumOk,
      issuedAt: row.issuedAt.toISO(),
      revoked: false,
      cleared: row.cleared,
      studentNumber: row.studentNumber,
      studentName: row.snapshotJson.studentName,
      verifyUrl: this.verifyUrl(row.documentToken),
    }
  }

  async getForAuthorizedUser(documentToken: string, organizationId: string) {
    const row = await UsisClearanceReport.query()
      .where('document_token', documentToken)
      .where('organization_id', organizationId)
      .first()
    if (!row || row.revokedAt) return null
    return {
      reportId: row.id,
      documentToken: row.documentToken,
      snapshotChecksum: row.snapshotChecksum,
      verifyUrl: this.verifyUrl(row.documentToken),
      issuedAt: row.issuedAt.toISO(),
      cleared: row.cleared,
      snapshot: row.snapshotJson,
    }
  }

  async listRecent(organizationId: string, input?: { studentId?: string | null; limit?: number }) {
    let query = UsisClearanceReport.query()
      .where('organization_id', organizationId)
      .whereNull('revoked_at')
      .orderBy('issued_at', 'desc')
      .limit(input?.limit ?? 30)
    if (input?.studentId) query = query.where('student_id', input.studentId)
    const rows = await query
    return rows.map((row) => ({
      reportId: row.id,
      documentToken: row.documentToken,
      studentNumber: row.studentNumber,
      studentName: row.snapshotJson?.studentName ?? '',
      cleared: row.cleared,
      issuedAt: row.issuedAt.toISO(),
      verifyUrl: this.verifyUrl(row.documentToken),
      snapshotChecksum: row.snapshotChecksum,
    }))
  }

  async pdfPackage(documentToken: string, organizationId: string) {
    const row = await UsisClearanceReport.query()
      .where('document_token', documentToken)
      .where('organization_id', organizationId)
      .first()
    if (!row || row.revokedAt) return null

    const { rowsToSimplePdf } = await import('#modules/enrollment/services/report_export')
    const checks = row.snapshotJson?.checks ?? {}
    const officeRows = Object.entries(checks).map(([office, check]) => ({
      office,
      status: check?.cleared ? 'cleared' : check?.error ? 'unavailable' : 'hold',
      openItems: check?.openItems ?? '',
    }))
    if (!officeRows.length) {
      officeRows.push({ office: 'snapshot', status: row.cleared ? 'cleared' : 'hold', openItems: '' })
    }

    const verifyUrl = this.verifyUrl(row.documentToken)
    const body = rowsToSimplePdf(
      'WMSU USiS — Clearance certificate (ENR-025)',
      officeRows,
      [
        `Student: ${row.snapshotJson?.studentName ?? ''} (${row.studentNumber})`,
        `Overall: ${row.cleared ? 'CLEARED' : 'WITH HOLDS'}`,
        `Issued: ${row.issuedAt.toISO()}`,
        `Checksum: ${row.snapshotChecksum}`,
        `QR validation URL: ${verifyUrl}`,
        'Print this PDF or the on-screen certificate; open the URL to validate the immutable snapshot.',
      ]
    )
    const slug = String(row.studentNumber || 'student').replace(/[^a-zA-Z0-9_-]+/g, '_')
    return {
      contentType: 'application/pdf',
      filename: `clearance-${slug}-${row.documentToken.slice(0, 8)}.pdf`,
      body,
      meta: {
        documentToken: row.documentToken,
        verifyUrl,
        cleared: row.cleared,
      },
    }
  }
}

export const clearanceReportService = new ClearanceReportService()
