import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import DocumentVersion from '#modules/documents/models/document_version'

export default class DocumentFile extends BaseModel {
  static table = t('document_files')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare versionId: string | null

  @column()
  declare fileName: string

  @column()
  declare originalName: string

  @column()
  declare mimeType: string

  @column()
  declare fileSize: number

  @column({ columnName: 's3_key' })
  declare s3Key: string

  @column({ columnName: 's3_bucket' })
  declare s3Bucket: string

  @column()
  declare checksum: string | null

  @column()
  declare virusScanned: boolean

  @column()
  declare virusClean: boolean | null

  @column()
  declare extractedMetadata: Record<string, unknown> | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => DocumentVersion, { foreignKey: 'versionId' })
  declare version: BelongsTo<typeof DocumentVersion>
}
