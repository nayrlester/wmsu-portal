import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Subject from '#modules/enrollment/models/subject'

export default class UsisSubjectEquivalency extends BaseModel {
  static table = t('usis_subject_equivalencies')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare internalSubjectId: string

  @column()
  declare externalCode: string

  @column()
  declare externalTitle: string | null

  @column()
  declare sourceSchool: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Subject, { foreignKey: 'internalSubjectId' })
  declare internalSubject: BelongsTo<typeof Subject>
}
