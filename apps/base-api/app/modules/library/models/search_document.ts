import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export type SearchEntityType = 'book' | 'member' | 'transaction'

export interface SearchDocumentMetadata {
  genre?: string | null
  categoryId?: string | null
  categoryName?: string | null
  availableCopies?: number
  totalCopies?: number
  borrowCount?: number
  createdAt?: string
  memberType?: string
  membershipStatus?: string
  borrowingStatus?: string
  bookTitle?: string | null
  memberName?: string | null
  transactionNumber?: string | null
  isbn13?: string | null
  libraryCardNumber?: string | null
}

export default class SearchDocument extends BaseModel {
  static table = t('search_documents')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare entityType: SearchEntityType

  @column()
  declare entityId: string

  @column()
  declare label: string

  @column()
  declare subtitle: string | null

  @column()
  declare metadata: SearchDocumentMetadata

  @column.dateTime()
  declare indexedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
