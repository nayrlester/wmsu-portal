import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type PlatformDocumentPrefix = 'hris' | 'library' | 'doctrack'
export type PlatformDocumentStatus = 'active' | 'deleted'

export default class PlatformDocument extends BaseModel {
  static table = t('platform_documents')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare orgId: string

  @column()
  declare platformPrefix: PlatformDocumentPrefix

  @column()
  declare platformLabel: string

  @column()
  declare storageKey: string

  @column()
  declare originalName: string

  @column()
  declare contentType: string

  @column()
  declare sizeBytes: number

  @column()
  declare uploadedBy: string

  @column()
  declare entityType: string | null

  @column()
  declare entityId: string | null

  @column()
  declare status: PlatformDocumentStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
