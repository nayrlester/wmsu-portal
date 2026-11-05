import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Subject from '#modules/enrollment/models/subject'

export default class SubjectPrerequisite extends BaseModel {
  static table = t('subject_prerequisites')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare subjectId: string

  @column()
  declare requiresSubjectId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Subject, { foreignKey: 'subjectId' })
  declare subject: BelongsTo<typeof Subject>

  @belongsTo(() => Subject, { foreignKey: 'requiresSubjectId' })
  declare requiresSubject: BelongsTo<typeof Subject>
}
