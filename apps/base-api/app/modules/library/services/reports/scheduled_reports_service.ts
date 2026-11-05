import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import Tenant from '#modules/library/models/tenant'
import ReportService from '#modules/library/services/reports/report_service'
import EmailChannel from '#modules/library/services/notifications/email_channel'
import { tenantContext, toTenantContext } from '#modules/library/services/tenant/tenant_context'

function parseEmails(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@'))
}

/**
 * Daily/weekly scheduled email of collections + overdue CSV reports
 * for tenants with report_schedule_enabled.
 */
export default class ScheduledReportsService {
  constructor(
    private reportService = new ReportService(),
    private emailChannel = new EmailChannel()
  ) {}

  async runScheduledReports() {
    const tenants = await Tenant.query()
      .where('report_schedule_enabled', true)
      .where('status', 'active')

    let tenantsProcessed = 0
    let emailsSent = 0
    let skipped = 0

    for (const tenant of tenants) {
      const emails = parseEmails(tenant.reportScheduleEmails)
      if (!emails.length) {
        skipped++
        logger.info({ tenantId: tenant.id }, 'Scheduled reports skipped: no emails configured')
        continue
      }

      // Default weekly Monday 07:00 when cron unset; `*` dow = daily
      const cron = tenant.reportScheduleCron?.trim() || '0 7 * * 1'
      if (!this.shouldRunToday(cron)) {
        skipped++
        continue
      }

      try {
        const result = await tenantContext.run(toTenantContext(tenant), async () => {
          return this.sendReportsForTenant(tenant, emails)
        })
        tenantsProcessed++
        emailsSent += result.sent
      } catch (error) {
        logger.error(
          { err: error, tenantId: tenant.id },
          'Scheduled reports failed for tenant'
        )
      }
    }

    return { tenantsProcessed, emailsSent, skipped, checked: tenants.length }
  }

  private shouldRunToday(cron: string): boolean {
    const parts = cron.trim().split(/\s+/)
    // Standard 5-field cron: min hour dom mon dow
    if (parts.length < 5) return true

    const dow = parts[4]
    if (dow === '*') return true

    // Luxon: 1=Mon..7=Sun → cron: 0=Sun, 1=Mon..6=Sat
    const cronDow = DateTime.now().weekday === 7 ? 0 : DateTime.now().weekday

    const allowed = dow.split(',').flatMap((token) => {
      if (token.includes('-')) {
        const [a, b] = token.split('-').map(Number)
        const list: number[] = []
        for (let i = a; i <= b; i++) list.push(i)
        return list
      }
      return [Number(token)]
    })

    if (allowed.some((d) => Number.isNaN(d))) return true
    return allowed.includes(cronDow)
  }

  private async sendReportsForTenant(tenant: Tenant, emails: string[]) {
    const [collections, overdue] = await Promise.all([
      this.reportService.generate('collections'),
      this.reportService.generate('overdue'),
    ])

    const collectionsCsv = this.reportService.toCsv(collections)
    const overdueCsv = this.reportService.toCsv(overdue)
    const generatedAt = DateTime.now().toFormat('yyyy-LL-dd HH:mm')

    const body = [
      `Scheduled library reports for ${tenant.name}`,
      `Generated: ${generatedAt}`,
      '',
      `Collections report: ${collections.length} rows`,
      `Overdue report: ${overdue.length} rows`,
      '',
      '--- COLLECTIONS (CSV) ---',
      collectionsCsv || '(no rows)',
      '',
      '--- OVERDUE (CSV) ---',
      overdueCsv || '(no rows)',
      '',
      'Configure schedule under Settings → Scheduled report email.',
    ].join('\n')

    let sent = 0
    for (const email of emails) {
      const result = await this.emailChannel.send({
        tenantId: tenant.id,
        eventType: 'scheduled_report',
        recipientType: 'user',
        email,
        title: `[${tenant.name}] Scheduled library reports`,
        body,
      })
      if (result.success) sent++
      else {
        logger.warn(
          { tenantId: tenant.id, email, error: result.error },
          'Scheduled report email failed'
        )
      }
    }

    return { sent }
  }
}
