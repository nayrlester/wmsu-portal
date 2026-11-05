import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/inventory/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import CoaDocument from '#modules/inventory/models/coa_document'
import Asset from '#modules/inventory/models/asset'
import Item from '#modules/inventory/models/item'

export default class CoaDocumentLine extends BaseModel {
  static table = t('coa_document_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare documentId: string

  @column()
  declare assetId: string | null

  @column()
  declare itemId: string | null

  @column()
  declare description: string

  @column()
  declare propertyNumber: string | null

  @column({ consume: (v) => Number(v) })
  declare quantity: number

  @column()
  declare uom: string | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare unitCost: number | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare totalCost: number | null

  @column()
  declare condition: string | null

  @column({
    prepare: (v) => (v == null ? null : JSON.stringify(v)),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare metadata: Record<string, unknown> | null

  @belongsTo(() => CoaDocument, { foreignKey: 'documentId' })
  declare document: BelongsTo<typeof CoaDocument>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>
}
