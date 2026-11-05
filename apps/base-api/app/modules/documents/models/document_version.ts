import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import DocumentFile from '#modules/documents/models/document_file'
import User from '#modules/documents/models/user'

export default class DocumentVersion extends BaseModel {
  static table = t('document_versions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare versionNumber: number

  @column()
  declare versionMinor: number

  @column()
  declare status: string

  @column()
  declare changeNotes: string | null

  @column()
  declare contentHtml: string | null

  @column()
  declare sourceType: string

  @column()
  declare createdById: string

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @hasMany(() => DocumentFile, { foreignKey: 'versionId' })
  declare files: HasMany<typeof DocumentFile>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>
}
