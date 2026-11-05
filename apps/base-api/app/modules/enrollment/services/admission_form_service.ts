import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import Organization from '#modules/enrollment/models/organization'
import Applicant from '#modules/enrollment/models/applicant'
import UsisAdmissionFormConfig, {
  type AdmissionFormField,
  type AdmissionSurveyQuestion,
} from '#modules/enrollment/models/usis_admission_form_config'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

function badRequest(message: string) {
  return new Exception(message, { status: 422, code: 'E_VALIDATION_FAILURE' })
}

function emailApplyLockKey(organizationId: string, email: string) {
  return createHash('md5').update(`usis-apply:${organizationId}:${email}`).digest().readInt32BE(0)
}

export class AdmissionFormService {
  async listConfigs(organizationId: string) {
    return UsisAdmissionFormConfig.query()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
  }

  async getActive(organizationId: string) {
    return UsisAdmissionFormConfig.query()
      .where('organization_id', organizationId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')
      .first()
  }

  async resolveOrganizationId(orgCode?: string | null) {
    const code = (orgCode || 'UNI').trim().toUpperCase()
    const org = await Organization.query().where('code', code).first()
    if (!org) throw badRequest(`Unknown organization code: ${code}`)
    return org.id
  }

  async createConfig(
    organizationId: string,
    data: {
      version: string
      name: string
      formFields?: AdmissionFormField[]
      surveyQuestions?: AdmissionSurveyQuestion[]
      termsText?: string
      privacyConsentText?: string
      isActive?: boolean
    },
    actorUserId: string
  ) {
    if (data.isActive) {
      await UsisAdmissionFormConfig.query()
        .where('organization_id', organizationId)
        .where('is_active', true)
        .update({ isActive: false })
    }

    const row = await UsisAdmissionFormConfig.create({
      organizationId,
      version: data.version.trim(),
      name: data.name.trim(),
      formFields: data.formFields ?? [],
      surveyQuestions: data.surveyQuestions ?? [],
      termsText: data.termsText ?? '',
      privacyConsentText: data.privacyConsentText ?? '',
      isActive: data.isActive ?? false,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_admission_form_config',
      entityId: row.id,
    })
    return row
  }

  async updateConfig(
    organizationId: string,
    id: string,
    data: Partial<{
      name: string
      formFields: AdmissionFormField[]
      surveyQuestions: AdmissionSurveyQuestion[]
      termsText: string
      privacyConsentText: string
      isActive: boolean
    }>,
    actorUserId: string
  ) {
    const row = await UsisAdmissionFormConfig.query()
      .where('organization_id', organizationId)
      .where('id', id)
      .firstOrFail()

    if (data.isActive === true) {
      await UsisAdmissionFormConfig.query()
        .where('organization_id', organizationId)
        .where('is_active', true)
        .whereNot('id', id)
        .update({ isActive: false })
    }

    if (data.name !== undefined) row.name = data.name.trim()
    if (data.formFields !== undefined) row.formFields = data.formFields
    if (data.surveyQuestions !== undefined) row.surveyQuestions = data.surveyQuestions
    if (data.termsText !== undefined) row.termsText = data.termsText
    if (data.privacyConsentText !== undefined) row.privacyConsentText = data.privacyConsentText
    if (data.isActive !== undefined) row.isActive = data.isActive
    await row.save()

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_admission_form_config',
      entityId: row.id,
    })
    return row
  }

  private assertRequiredAnswers(
    fields: Array<{ key: string; required?: boolean; label?: string; prompt?: string }>,
    answers: Record<string, unknown>,
    kind: string
  ) {
    for (const field of fields) {
      if (!field.required) continue
      const value = answers[field.key]
      if (value === undefined || value === null || String(value).trim() === '') {
        throw badRequest(`${kind} requires answer for "${field.label || field.prompt || field.key}"`)
      }
    }
  }

  async createOnlineApplication(input: {
    organizationId: string
    applicationNumber?: string
    firstName: string
    middleName?: string | null
    lastName: string
    email: string
    mobile?: string | null
    birthDate?: string | null
    programId?: string | null
    classification?: string | null
    formAnswers?: Record<string, unknown>
    surveyAnswers?: Record<string, unknown>
    termsAccepted: boolean
    privacyConsentAccepted: boolean
    autoAssignEntranceExam?: boolean
  }) {
    const form = await this.getActive(input.organizationId)
    if (!form) throw badRequest('No active admission form is published')

    if (!input.termsAccepted) throw badRequest('Terms and agreements must be accepted')
    if (!input.privacyConsentAccepted) throw badRequest('Data-privacy consent must be captured')

    const formAnswers = input.formAnswers ?? {}
    const surveyAnswers = input.surveyAnswers ?? {}
    this.assertRequiredAnswers(form.formFields, formAnswers, 'Application form')
    this.assertRequiredAnswers(form.surveyQuestions, surveyAnswers, 'Admission survey')

    const email = input.email.trim().toLowerCase()
    const classification = input.classification?.trim() || 'new'
    const now = DateTime.now()
    const lockKey = emailApplyLockKey(input.organizationId, email)

    const { applicant, reused } = await db.transaction(async (trx) => {
      await trx.rawQuery('SELECT pg_advisory_xact_lock(?)', [lockKey])

      const existing = await Applicant.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('email', email)
        .whereNotIn('status', ['admitted', 'rejected'])
        .orderBy('created_at', 'desc')
        .first()

      if (existing) {
        return { applicant: existing, reused: true as const }
      }

      const applicationNumber =
        input.applicationNumber?.trim() ||
        `APP-${DateTime.now().toFormat('yyyyLLdd')}-${Math.floor(Math.random() * 9000 + 1000)}`

      const created = await Applicant.create(
        {
          organizationId: input.organizationId,
          applicationNumber,
          firstName: input.firstName.trim(),
          middleName: input.middleName?.trim() || null,
          lastName: input.lastName.trim(),
          email,
          mobile: input.mobile?.trim() || null,
          birthDate: input.birthDate ? DateTime.fromISO(input.birthDate) : null,
          programId: input.programId || null,
          classification,
          status: 'pending',
          appliedAt: now,
          formConfigId: form.id,
          formAnswers,
          surveyAnswers,
          termsAcceptedAt: now,
          privacyConsentAt: now,
          privacyConsentVersion: form.version,
        },
        { client: trx }
      )

      return { applicant: created, reused: false as const }
    })

    const { admissionEventsService } = await import(
      '#modules/enrollment/services/admission_events_service'
    )

    if (!reused) {
      await admissionEventsService.recordStatusChange({
        organizationId: input.organizationId,
        applicantId: applicant.id,
        fromStatus: null,
        toStatus: 'pending',
        note: `Online application received (${classification})`,
      })
    }

    let examAssignment = null
    if (input.autoAssignEntranceExam !== false) {
      try {
        examAssignment = await admissionEventsService.autoAssignOnlineEntranceExam(
          input.organizationId,
          applicant.id
        )
      } catch {
        examAssignment = null
      }
    }

    if (!reused) {
      await auditLogService.log({
        organizationId: input.organizationId,
        action: AuditAction.CREATE,
        entityType: 'applicant',
        entityId: applicant.id,
        metadata: {
          source: 'online_application',
          formConfigId: form.id,
          privacyConsentVersion: form.version,
          classification,
          examAssignmentId: examAssignment?.id ?? null,
        },
      })

      void this.sendApplicationReceivedEmail(applicant).catch(() => undefined)
    }

    return { applicant, form, examAssignment, reused }
  }

  private async sendApplicationReceivedEmail(applicant: Applicant) {
    const { emailJsMailerService } = await import(
      '#modules/common-platform/services/emailjs_mailer_service'
    )
    if (!emailJsMailerService.isConfigured() || !applicant.email) return

    const name = `${applicant.firstName} ${applicant.lastName}`.trim()
    const subject = `WMSU application received — ${applicant.applicationNumber}`
    const message = [
      `Hi ${name},`,
      '',
      `We received your online admission application.`,
      `Application number: ${applicant.applicationNumber}`,
      `Use this number and your email (${applicant.email}) to check status and continue your journey in the guest portal.`,
      '',
      'Thank you,',
      'WMSU Admissions',
    ].join('\n')

    await emailJsMailerService.send({
      toEmail: applicant.email,
      toName: name,
      subject,
      message,
      extraParams: {
        application_number: applicant.applicationNumber,
        channel: 'admission_apply',
      },
    })
  }
}

export const admissionFormService = new AdmissionFormService()
