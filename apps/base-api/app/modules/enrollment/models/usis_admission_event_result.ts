import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'
import Applicant from '#modules/enrollment/models/applicant'
import UsisAdmissionEvent from '#modules/enrollment/models/usis_admission_event'

export type AdmissionEventResultValue = 'pending' | 'pass' | 'fail' | 'waived'

export default class UsisAdmissionEventResult extends BaseModel {
  static table = t('usis_admission_event_results')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare eventId: string

  @column()
  declare applicantId: string

  @column({
    prepare: (value: number | null) => value,
    consume: (value: string | number | null) => (value == null ? null : Number(value)),
  })
  declare score: number | null

  @column()
  declare result: AdmissionEventResultValue

  @column()
  declare remarks: string | null

  @column()
  declare recordedBy: string | null

  @column.dateTime()
  declare recordedAt: DateTime | null

  @column({
    prepare: (value: Record<string, number> | null) =>
      value == null ? null : JSON.stringify(value),
    consume: (value: string | Record<string, number> | null) => {
      if (value == null) return null
      return typeof value === 'string'
        ? (JSON.parse(value) as Record<string, number>)
        : value
    },
  })
  declare answersJson: Record<string, number> | null

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column()
  declare attemptCount: number

  @column({
    prepare: (value: number | null) => value,
    consume: (value: string | number | null) => (value == null ? null : Number(value)),
  })
  declare maxScore: number | null

  @column({
    prepare: (value: number | null) => value,
    consume: (value: string | number | null) => (value == null ? null : Number(value)),
  })
  declare percentScore: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => UsisAdmissionEvent, { foreignKey: 'eventId' })
  declare event: BelongsTo<typeof UsisAdmissionEvent>

  @belongsTo(() => Applicant)
  declare applicant: BelongsTo<typeof Applicant>
}
