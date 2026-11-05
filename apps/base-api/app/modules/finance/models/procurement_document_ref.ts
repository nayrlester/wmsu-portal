import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import { DateTime } from 'luxon'

export default class ProcurementDocumentRef extends BaseModel {
  static table = t('procurement_document_refs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare entityType: string

  @column()
  declare entityId: string

  @column()
  declare category: string

  @column()
  declare fileName: string

  @column()
  declare externalRef: string | null

  @column()
  declare mimeType: string | null

  @column()
  declare sizeBytes: number | null

  @column()
  declare uploadedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
