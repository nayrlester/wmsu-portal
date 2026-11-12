import { DateTime } from 'luxon'
import env from '#start/env'
import UlmisIntegrationOutbox from '#modules/library/models/ulmis_integration_outbox'
import Tenant from '#modules/library/models/tenant'
import AcquisitionRequest from '#modules/library/models/acquisition_request'
import { tenantContext, toTenantContext } from '#modules/library/services/tenant/tenant_context'

const MAX_ATTEMPTS = 5

type DispatchResult = { ok: true; externalRef?: string } | { ok: false; error: string }

export default class UlmisIntegrationDispatchService {
  async dispatchPending(limit = 50) {
    const rows = await UlmisIntegrationOutbox.query()
      .where('status', 'pending')
      .where('attempt_count', '<', MAX_ATTEMPTS)
      .orderBy('created_at', 'asc')
      .limit(limit)

    let sent = 0
    let failed = 0

    for (const row of rows) {
      const tenant = await Tenant.find(row.tenantId)
      if (!tenant) {
        await this.markFailed(row, 'Tenant missing')
        failed++
        continue
      }

      await tenantContext.run(toTenantContext(tenant), async () => {
        row.status = 'processing'
        row.attemptCount += 1
        await row.save()

        const outcome = await this.dispatchRow(row)
        if (outcome.ok) {
          await this.markSent(row, outcome.externalRef)
          sent++
        } else {
          await this.markFailed(row, outcome.error)
          failed++
        }
      })
    }

    return { processed: rows.length, sent, failed }
  }

  private async dispatchRow(row: UlmisIntegrationOutbox): Promise<DispatchResult> {
    const dryRun = env.get('ULMIS_INTEGRATION_DRY_RUN', 'true') === 'true'
    const serviceKey = env.get('SERVICE_API_KEY') ?? ''

    switch (row.contractCode) {
      case 'INT-LIB-04':
        return this.postJson(
          env.get('ULMIS_CIS_DEFICIENCY_URL'),
          row,
          serviceKey,
          dryRun,
          'library.deficiency'
        )
      case 'INT-LIB-05':
        return this.postJson(
          env.get('ULMIS_UFMS_FINE_REFERRAL_URL'),
          row,
          serviceKey,
          dryRun,
          'library.fine.referral'
        )
      case 'INT-LIB-06':
        return this.postJson(
          env.get('ULMIS_UFMS_PAYMENT_RECONCILE_URL'),
          row,
          serviceKey,
          dryRun,
          'library.fine.payment'
        )
      case 'INT-LIB-07':
        return this.dispatchAcquisitionPr(row, serviceKey, dryRun)
      default:
        return { ok: false, error: `Unsupported contract ${row.contractCode}` }
    }
  }

  private async dispatchAcquisitionPr(
    row: UlmisIntegrationOutbox,
    serviceKey: string,
    dryRun: boolean
  ): Promise<DispatchResult> {
    const url = env.get('ULMIS_UFMS_PR_URL')
    const base = this.postJson(url, row, serviceKey, dryRun, 'library.acquisition.pr')
    const outcome = await base
    if (!outcome.ok) return outcome

    const acquisitionId = String(row.payload?.acquisitionRequestId ?? '')
    if (acquisitionId && outcome.externalRef) {
      const request = await AcquisitionRequest.find(acquisitionId)
      if (request && !request.ufmsPrRef) {
        request.ufmsPrRef = outcome.externalRef
        if (request.status === 'routed') {
          request.status = 'acknowledged'
        }
        await request.save()
      }
    }
    return outcome
  }

  private async postJson(
    url: string | undefined,
    row: UlmisIntegrationOutbox,
    serviceKey: string,
    dryRun: boolean,
    label: string
  ): Promise<DispatchResult> {
    if (!url?.trim() || dryRun) {
      return { ok: true, externalRef: `stub-${label}-${row.idempotencyKey}` }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': row.idempotencyKey,
          ...(serviceKey ? { 'X-Service-Api-Key': serviceKey } : {}),
        },
        body: JSON.stringify({
          contractCode: row.contractCode,
          eventType: row.eventType,
          payload: row.payload,
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 500)}` }
      }

      let externalRef: string | undefined
      try {
        const body = (await response.json()) as { data?: { ref?: string; id?: string } }
        externalRef = body.data?.ref ?? body.data?.id
      } catch {
        externalRef = undefined
      }

      return { ok: true, externalRef }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, error: message }
    }
  }

  private async markSent(row: UlmisIntegrationOutbox, externalRef?: string) {
    const payload = { ...row.payload }
    if (externalRef) payload.dispatchRef = externalRef
    row.payload = payload
    row.status = 'sent'
    row.lastError = null
    row.processedAt = row.processedAt ?? DateTime.now()
    await row.save()
  }

  private async markFailed(row: UlmisIntegrationOutbox, error: string) {
    row.status = row.attemptCount >= MAX_ATTEMPTS ? 'failed' : 'pending'
    row.lastError = error.slice(0, 2000)
    await row.save()
  }
}
