import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Student from '#modules/enrollment/models/student'
import Enrollment from '#modules/enrollment/models/enrollment'
import User from '#modules/enrollment/models/user'

export default class Payment extends BaseModel {
  static table = t('payments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare studentId: string

  @column()
  declare enrollmentId: string | null

  @column()
  declare orNumber: string | null

  @column()
  declare amount: number

  @column()
  declare paymentType: string

  @column()
  declare reference: string | null

  @column()
  declare assessmentId: string | null

  @column()
  declare ufmsPaymentId: string | null

  @column()
  declare confirmationSource: string | null

  @column()
  declare ufmsConfirmed: boolean

  @column.dateTime()
  declare paidAt: DateTime

  @column()
  declare receivedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => Enrollment)
  declare enrollment: BelongsTo<typeof Enrollment>

  @belongsTo(() => User, { foreignKey: 'receivedBy' })
  declare receiver: BelongsTo<typeof User>
}
