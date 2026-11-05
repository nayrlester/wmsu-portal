import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/inventory/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/inventory/models/organization'
import Asset from '#modules/inventory/models/asset'
import CoaDocument from '#modules/inventory/models/coa_document'
import User from '#modules/inventory/models/user'

export default class PropertyLedgerEntry extends BaseModel {
  static table = t('property_ledger_entries')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare assetId: string

  @column()
  declare entryType: string

  @column()
  declare reference: string | null

  @column({ consume: (v) => Number(v) })
  declare debit: number

  @column({ consume: (v) => Number(v) })
  declare credit: number

  @column({ consume: (v) => Number(v) })
  declare balanceAfter: number

  @column()
  declare narrative: string | null

  @column()
  declare coaDocumentId: string | null

  @column()
  declare createdBy: string | null

  @column.dateTime()
  declare occurredAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @belongsTo(() => CoaDocument, { foreignKey: 'coaDocumentId' })
  declare coaDocument: BelongsTo<typeof CoaDocument>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
