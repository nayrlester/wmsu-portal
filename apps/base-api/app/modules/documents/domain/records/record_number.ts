import db from '@adonisjs/lucid/services/db'

/** Tenant-scoped yearly counters stored in record_number_sequences. */
export async function nextRecordNumber(
  tenantId: string,
  sequenceName: string,
  prefix: string,
  trx?: any
): Promise<string> {
  const run = async (client: any) => {
    const year = new Date().getFullYear()
    const existing = await client
      .from('record_number_sequences')
      .where({ tenant_id: tenantId, sequence_name: sequenceName, year })
      .forUpdate()
      .first()

    let nextNumber: number
    if (existing) {
      nextNumber = Number(existing.last_number) + 1
      await client
        .from('record_number_sequences')
        .where({ id: existing.id })
        .update({ last_number: nextNumber, updated_at: new Date() })
    } else {
      nextNumber = 1
      await client.table('record_number_sequences').insert({
        tenant_id: tenantId,
        sequence_name: sequenceName,
        year,
        last_number: nextNumber,
        created_at: new Date(),
      })
    }

    return `${prefix}-${year}-${String(nextNumber).padStart(7, '0')}`
  }

  if (trx) return run(trx)
  return db.transaction((client) => run(client))
}
