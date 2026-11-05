import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Asset from '#modules/enrollment/models/asset'
import Organization from '#modules/enrollment/models/organization'

export default class UimsImportHrisAssets extends BaseCommand {
  static commandName = 'uims:import-hris-assets'
  static description = 'Import assets from HRIS JSON export'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Path to JSON file with HRIS asset data' })
  declare filePath: string

  async run() {
    const fs = await import('node:fs/promises')
    const raw = await fs.readFile(this.filePath, 'utf-8')
    const records: HrisAssetRecord[] = JSON.parse(raw)

    const org = await Organization.query().orderBy('created_at').firstOrFail()
    this.logger.info(`Importing ${records.length} assets into org "${org.name}"`)

    let created = 0
    let updated = 0

    for (const rec of records) {
      const existing = await Asset.query()
        .where('organizationId', org.id)
        .where('assetCode', rec.asset_code ?? rec.assetCode ?? '')
        .first()

      if (existing) {
        existing.merge({
          name: rec.name ?? existing.name,
          serialNumber: rec.serial_number ?? rec.serialNumber ?? existing.serialNumber,
          custodianExternalId: rec.custodian_external_id ?? rec.custodianExternalId ?? existing.custodianExternalId,
          custodianName: rec.custodian_name ?? rec.custodianName ?? existing.custodianName,
          status: rec.custodian_external_id || rec.custodianExternalId ? 'assigned' : existing.status,
        })
        await existing.save()
        updated++
      } else {
        await Asset.create({
          organizationId: org.id,
          assetCode: rec.asset_code ?? rec.assetCode ?? `HRIS-${created + 1}`,
          name: rec.name ?? 'Imported Asset',
          assetType: rec.asset_type ?? rec.assetType ?? 'equipment',
          serialNumber: rec.serial_number ?? rec.serialNumber ?? null,
          propertyNumber: rec.property_number ?? rec.propertyNumber ?? null,
          manufacturer: rec.manufacturer ?? null,
          model: rec.model ?? null,
          fundSource: rec.fund_source ?? rec.fundSource ?? null,
          purchaseDate: rec.purchase_date ?? rec.purchaseDate ?? null,
          purchaseCost: rec.purchase_cost ?? rec.purchaseCost ?? null,
          custodianExternalId: rec.custodian_external_id ?? rec.custodianExternalId ?? null,
          custodianName: rec.custodian_name ?? rec.custodianName ?? null,
          custodianEmail: rec.custodian_email ?? rec.custodianEmail ?? null,
          status: (rec.custodian_external_id || rec.custodianExternalId) ? 'assigned' : 'available',
          lifecycleStage: 'active',
        })
        created++
      }
    }

    this.logger.success(`Import complete: ${created} created, ${updated} updated`)
  }
}

interface HrisAssetRecord {
  asset_code?: string
  assetCode?: string
  name?: string
  asset_type?: string
  assetType?: string
  serial_number?: string
  serialNumber?: string
  property_number?: string
  propertyNumber?: string
  manufacturer?: string
  model?: string
  fund_source?: string
  fundSource?: string
  purchase_date?: string
  purchaseDate?: string
  purchase_cost?: number
  purchaseCost?: number
  custodian_external_id?: string
  custodianExternalId?: string
  custodian_name?: string
  custodianName?: string
  custodian_email?: string
  custodianEmail?: string
}
