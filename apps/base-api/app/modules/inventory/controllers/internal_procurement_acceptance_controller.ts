import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class InternalProcurementAcceptanceController {
  async accept({ request, response }: HttpContext) {
    const payload = request.body() as Record<string, unknown>
    const organizationId = String(payload.organizationId ?? payload.organization_id ?? '')
    const reference = String(payload.iarNumber ?? payload.iar_id ?? payload.reference ?? '')
    if (!organizationId) {
      return response.badRequest({ error: 'organizationId is required' })
    }

    await db.table('inventory.integration_inbox').insert({
      id: crypto.randomUUID(),
      source_system: 'ufms',
      event_type: 'procurement.acceptance',
      external_ref: reference || null,
      organization_id: organizationId,
      payload: JSON.stringify(payload),
      status: 'received',
      received_at: DateTime.now().toSQL(),
      created_at: DateTime.now().toSQL(),
      updated_at: DateTime.now().toSQL(),
    }).catch(async () => {
      await db.rawQuery(
        `CREATE TABLE IF NOT EXISTS inventory.integration_inbox (
          id uuid PRIMARY KEY,
          source_system varchar(64) NOT NULL,
          event_type varchar(128) NOT NULL,
          external_ref varchar(128),
          organization_id uuid,
          payload jsonb NOT NULL,
          status varchar(32) NOT NULL DEFAULT 'received',
          received_at timestamptz NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz
        )`
      )
      await db.table('inventory.integration_inbox').insert({
        id: crypto.randomUUID(),
        source_system: 'ufms',
        event_type: 'procurement.acceptance',
        external_ref: reference || null,
        organization_id: organizationId,
        payload: JSON.stringify(payload),
        status: 'received',
        received_at: DateTime.now().toSQL(),
        created_at: DateTime.now().toSQL(),
        updated_at: DateTime.now().toSQL(),
      })
    })

    return response.ok({
      data: {
        accepted: true,
        organizationId,
        reference: reference || null,
        receivedAt: DateTime.now().toISO(),
      },
    })
  }
}
