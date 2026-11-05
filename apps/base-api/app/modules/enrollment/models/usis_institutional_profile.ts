import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'

export type InstitutionalSignatory = { role: string; name: string; title?: string | null }

export default class UsisInstitutionalProfile extends BaseModel {
  static table = t('usis_institutional_profiles')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare legalName: string

  @column()
  declare displayName: string | null

  @column()
  declare logoUrl: string | null

  @column()
  declare signatories: InstitutionalSignatory[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
