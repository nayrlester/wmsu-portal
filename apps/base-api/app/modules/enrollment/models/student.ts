import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Program from '#modules/enrollment/models/program'
import Applicant from '#modules/enrollment/models/applicant'

export default class Student extends BaseModel {
  static table = t('students')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentNumber: string

  @column()
  declare applicantId: string | null

  @column()
  declare firstName: string

  @column()
  declare middleName: string | null

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column()
  declare mobile: string | null

  @column.date()
  declare birthDate: DateTime | null

  @column()
  declare programId: string | null

  @column()
  declare status: string

  @column()
  declare classification: string | null

  @column()
  declare mdmCampusId: string | null

  @column()
  declare yearLevel: number | null

  @column()
  declare platformUserId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Program)
  declare program: BelongsTo<typeof Program>

  @belongsTo(() => Applicant)
  declare applicant: BelongsTo<typeof Applicant>
}
