import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { t } from '#modules/enrollment/helpers/db_schema'
import Organization from '#modules/enrollment/models/organization'

export type AdmissionFormField = {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea'
  required?: boolean
  options?: string[]
}

export type AdmissionSurveyQuestion = {
  key: string
  prompt: string
  required?: boolean
}

export default class UsisAdmissionFormConfig extends BaseModel {
  static table = t('usis_admission_form_configs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare version: string

  @column()
  declare name: string

  @column({
    prepare: (value: AdmissionFormField[]) => JSON.stringify(value ?? []),
    consume: (value: string | AdmissionFormField[]) =>
      typeof value === 'string' ? (JSON.parse(value) as AdmissionFormField[]) : value ?? [],
  })
  declare formFields: AdmissionFormField[]

  @column({
    prepare: (value: AdmissionSurveyQuestion[]) => JSON.stringify(value ?? []),
    consume: (value: string | AdmissionSurveyQuestion[]) =>
      typeof value === 'string' ? (JSON.parse(value) as AdmissionSurveyQuestion[]) : value ?? [],
  })
  declare surveyQuestions: AdmissionSurveyQuestion[]

  @column()
  declare termsText: string

  @column()
  declare privacyConsentText: string

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
