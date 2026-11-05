import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'

export type AdmissionEventType = 'entrance_exam' | 'interview' | 'assessment'
export type AdmissionDeliveryMode = 'onsite' | 'online' | 'hybrid'

export type AdmissionExamStrandTag = 'ABM' | 'STEM' | 'HUMSS' | 'GAS' | 'general'

export type AdmissionExamQuestion = {
  id: string
  prompt: string
  choices: string[]
  correctIndex: number
  strandTag?: AdmissionExamStrandTag
}

export default class UsisAdmissionEvent extends BaseModel {
  static table = t('usis_admission_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare eventType: AdmissionEventType

  @column()
  declare title: string

  @column.dateTime()
  declare scheduledAt: DateTime

  @column()
  declare location: string | null

  @column()
  declare capacity: number | null

  @column()
  declare notes: string | null

  @column()
  declare isActive: boolean

  @column()
  declare deliveryMode: AdmissionDeliveryMode

  @column({
    prepare: (value: number | null) => value,
    consume: (value: string | number | null) => (value == null ? null : Number(value)),
  })
  declare passScore: number | null

  @column()
  declare durationMinutes: number | null

  @column.dateTime()
  declare windowOpensAt: DateTime | null

  @column.dateTime()
  declare windowClosesAt: DateTime | null

  @column({
    prepare: (value: AdmissionExamQuestion[]) => JSON.stringify(value ?? []),
    consume: (value: string | AdmissionExamQuestion[]) =>
      typeof value === 'string'
        ? (JSON.parse(value) as AdmissionExamQuestion[])
        : (value ?? []),
  })
  declare questionsJson: AdmissionExamQuestion[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
