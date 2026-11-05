import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export type DigitalResourceType =
  | 'thesis'
  | 'dissertation'
  | 'faculty_publication'
  | 'research_report'
  | 'multimedia'
  | 'conference_paper'
  | 'institutional_document'
  | 'ebook'
  | 'other'

export default class DigitalRepositoryItem extends BaseModel {
  static table = t('digital_repository_items')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare title: string

  @column()
  declare resourceType: DigitalResourceType

  @column()
  declare authors: string | null

  @column()
  declare subjects: string | null

  @column()
  declare publicationYear: number | null

  @column()
  declare abstract: string | null

  @column()
  declare accessLevel: string

  @column()
  declare fileUrl: string | null

  @column()
  declare platformDocumentId: string | null

  @column()
  declare downloadCount: number

  @column()
  declare viewCount: number

  @column()
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null
}
