import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Book from '#modules/library/models/book'
import Tenant from '#modules/library/models/tenant'

export default class BookDigitalFile extends BaseModel {
  static table = t('book_digital_files')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare bookId: string

  @column()
  declare platformDocumentId: string

  @column()
  declare originalName: string

  @column()
  declare contentType: string | null

  @column()
  declare sizeBytes: number

  @column()
  declare uploadedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Book)
  declare book: BelongsTo<typeof Book>

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
