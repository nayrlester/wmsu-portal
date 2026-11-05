import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Book from '#modules/library/models/book'
import Member from '#modules/library/models/member'
import User from '#modules/library/models/user'

export type AcquisitionRequestStatus =
  | 'draft'
  | 'submitted'
  | 'routed'
  | 'acknowledged'
  | 'cataloged'
  | 'cancelled'

export default class AcquisitionRequest extends BaseModel {
  static table = t('acquisition_requests')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare requestNumber: string

  @column()
  declare status: AcquisitionRequestStatus

  @column()
  declare memberId: string | null

  @column()
  declare bookId: string | null

  @column()
  declare catalogedBookId: string | null

  @column()
  declare title: string

  @column()
  declare authors: string | null

  @column()
  declare isbn13: string | null

  @column()
  declare materialType: string | null

  @column()
  declare publisherName: string | null

  @column()
  declare publicationYear: number | null

  @column()
  declare quantity: number

  @column()
  declare justification: string | null

  @column()
  declare requestingUnit: string | null

  @column()
  declare ufmsPrRef: string | null

  @column()
  declare outboxId: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare submittedBy: string | null

  @column()
  declare routedBy: string | null

  @column()
  declare cancelledBy: string | null

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column.dateTime()
  declare routedAt: DateTime | null

  @column.dateTime()
  declare acknowledgedAt: DateTime | null

  @column.dateTime()
  declare catalogedAt: DateTime | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column()
  declare cancelReason: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Member)
  declare member: BelongsTo<typeof Member>

  @belongsTo(() => Book, { foreignKey: 'bookId' })
  declare book: BelongsTo<typeof Book>

  @belongsTo(() => Book, { foreignKey: 'catalogedBookId' })
  declare catalogedBook: BelongsTo<typeof Book>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
