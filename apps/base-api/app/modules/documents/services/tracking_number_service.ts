import db from '@adonisjs/lucid/services/db'
import TenantSetting from '#modules/documents/models/tenant_setting'

export class TrackingNumberService {
  async generate(tenantId: string): Promise<string> {
    const settings = await TenantSetting.findBy('tenant_id', tenantId)
    const prefix = settings?.trackingPrefix ?? 'DTS'
    const year = new Date().getFullYear()

    const result = await db.transaction(async (trx) => {
      const existing = await trx
        .from('tracking_sequences')
        .where({ tenant_id: tenantId, year })
        .forUpdate()
        .first()

      let nextNumber: number

      if (existing) {
        nextNumber = existing.last_number + 1
        await trx
          .from('tracking_sequences')
          .where({ id: existing.id })
          .update({ last_number: nextNumber, updated_at: new Date() })
      } else {
        nextNumber = 1
        await trx.table('tracking_sequences').insert({
          tenant_id: tenantId,
          year,
          last_number: nextNumber,
          created_at: new Date(),
        })
      }

      return `${prefix}-${year}-${String(nextNumber).padStart(7, '0')}`
    })

    return result
  }
}

export const trackingNumberService = new TrackingNumberService()
