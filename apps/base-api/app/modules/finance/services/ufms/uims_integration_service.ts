import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ProcurementUimsEvent from '#modules/finance/models/procurement_uims_event'
import { t } from '#modules/finance/helpers/db_schema'
import { receivablesService } from '#modules/finance/services/ufms/receivables_service'

export class UimsIntegrationService {
  async pushPendingEvents(organizationId: string) {
    const settings = await receivablesService.getSettings(organizationId)
    const baseUrl = (settings.uims_api_url as string | null)?.replace(/\/$/, '') ?? ''
    const apiKey = (settings.uims_service_api_key as string | null) ?? ''
    if (!baseUrl) {
      return { pushed: 0, skipped: true, reason: 'UIMS API URL not configured' }
    }

    const pending = await ProcurementUimsEvent.query()
      .where('organizationId', organizationId)
      .where('status', 'pending')
      .limit(50)

    let pushed = 0
    for (const event of pending) {
      try {
        const res = await fetch(`${baseUrl}/api/v1/internal/procurement/acceptance`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Service-Api-Key': apiKey,
          },
          body: JSON.stringify(event.payload),
        })
        if (!res.ok) {
          await event.merge({ status: 'failed', lastError: `HTTP ${res.status}` }).save()
          continue
        }
        await event.merge({ status: 'sent' }).save()
        pushed += 1
      } catch (error) {
        await event.merge({ status: 'failed', lastError: (error as Error).message }).save()
      }
    }
    return { pushed, skipped: false }
  }

  async recordAgencyExport(organizationId: string, agencyCode: string, exportFormat: string, payload: unknown) {
    const [row] = await db
      .table(t('agency_export_jobs'))
      .insert({
        organization_id: organizationId,
        agency_code: agencyCode,
        export_format: exportFormat,
        status: 'completed',
        payload: JSON.stringify(payload),
        exported_at: new Date(),
        created_at: new Date(),
      })
      .returning('*')
    return row
  }

  async exportEbudget(organizationId: string) {
    const lines = await db.from(t('budget_lines')).where('organization_id', organizationId)
    const payload = { generatedAt: DateTime.now().toISO(), lines }
    return this.recordAgencyExport(organizationId, 'DBM_EBUDGET', 'json', payload)
  }

  async exportBtms(organizationId: string) {
    const obligations = await db.from(t('budget_obligations')).where('organization_id', organizationId)
    const payload = { generatedAt: DateTime.now().toISO(), obligations }
    return this.recordAgencyExport(organizationId, 'DBM_BTMS', 'json', payload)
  }

  async exportEngas(organizationId: string) {
    const gl = await db.from(t('general_ledger_entries')).where('organization_id', organizationId).limit(5000)
    const payload = { generatedAt: DateTime.now().toISO(), entries: gl }
    return this.recordAgencyExport(organizationId, 'COA_ENGAS', 'json', payload)
  }
}

export const uimsIntegrationService = new UimsIntegrationService()
