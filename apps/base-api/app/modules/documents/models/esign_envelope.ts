import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import Document from '#modules/documents/models/document'
import DocumentVersion from '#modules/documents/models/document_version'
import DocumentFile from '#modules/documents/models/document_file'
import User from '#modules/documents/models/user'

export default class EsignEnvelope extends BaseModel {
  static table = t('esign_envelopes')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare versionId: string | null

  @column()
  declare fileId: string | null

  @column()
  declare pandadocDocumentId: string

  @column()
  declare status: string

  @column({
    prepare: (value: unknown) => (value === null || value === undefined ? '[]' : JSON.stringify(value)),
    consume: (value: string | Array<{ email: string; firstName?: string; lastName?: string; role?: string }>) => {
      if (value === null || value === undefined) return []
      if (typeof value === 'object') return value
      return JSON.parse(value) as Array<{
        email: string
        firstName?: string
        lastName?: string
        role?: string
      }>
    },
  })
  declare recipients: Array<{ email: string; firstName?: string; lastName?: string; role?: string }>

  @column()
  declare signedFileId: string | null

  @column()
  declare createdById: string | null

  @column()
  declare errorMessage: string | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => DocumentVersion, { foreignKey: 'versionId' })
  declare version: BelongsTo<typeof DocumentVersion>

  @belongsTo(() => DocumentFile, { foreignKey: 'fileId' })
  declare file: BelongsTo<typeof DocumentFile>

  @belongsTo(() => DocumentFile, { foreignKey: 'signedFileId' })
  declare signedFile: BelongsTo<typeof DocumentFile>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>
}
