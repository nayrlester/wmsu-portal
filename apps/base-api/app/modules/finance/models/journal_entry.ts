import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import FiscalPeriod from '#modules/finance/models/fiscal_period'
import JournalEntryLine from '#modules/finance/models/journal_entry_line'

export default class JournalEntry extends BaseModel {
  static table = t('journal_entries')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare entryNumber: string

  @column()
  declare entryType: string

  @column()
  declare fiscalYear: string

  @column()
  declare fiscalPeriodId: string | null

  @column.date()
  declare entryDate: DateTime

  @column()
  declare description: string

  @column()
  declare status: string

  @column()
  declare sourceModule: string | null

  @column()
  declare sourceRef: string | null

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column.dateTime()
  declare postedAt: DateTime | null

  @column()
  declare submittedBy: string | null

  @column()
  declare postedBy: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => FiscalPeriod)
  declare fiscalPeriod: BelongsTo<typeof FiscalPeriod>

  @hasMany(() => JournalEntryLine, { foreignKey: 'journalEntryId' })
  declare lines: HasMany<typeof JournalEntryLine>
}
