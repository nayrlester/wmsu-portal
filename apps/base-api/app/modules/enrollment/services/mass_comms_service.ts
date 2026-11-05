import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import UsisCommunicationSettings from '#modules/enrollment/models/usis_communication_settings'
import UsisMassSmsCampaign, {
  type MassSmsFilters,
  type MassSmsRecipientKind,
} from '#modules/enrollment/models/usis_mass_sms_campaign'
import UsisStudentContact from '#modules/enrollment/models/usis_student_contact'
import Student from '#modules/enrollment/models/student'
import type { AnnouncementAudience } from '#modules/enrollment/models/usis_announcement'

export type { MassSmsFilters, MassSmsRecipientKind }

function normalizeKinds(kinds?: MassSmsRecipientKind[]): MassSmsRecipientKind[] {
  const list = (kinds?.length ? kinds : ['student']).map((k) => k.toLowerCase() as MassSmsRecipientKind)
  return [...new Set(list)]
}

export class MassCommsService {
  async getDeliveryMode(organizationId: string) {
    let row = await UsisCommunicationSettings.find(organizationId)
    if (!row) {
      row = await UsisCommunicationSettings.create({
        organizationId,
        socialFeaturesEnabled: false,
        smsDeliveryMode: 'queue_only',
      })
    }
    return row.smsDeliveryMode || 'queue_only'
  }

  async updateDeliveryMode(organizationId: string, smsDeliveryMode: string) {
    const allowed = ['queue_only']
    if (!allowed.includes(smsDeliveryMode)) {
      throw new EnrollmentWorkflowError(
        'Only queue_only SMS delivery is configured (live provider integration pending)',
        422,
        'SMS_PROVIDER_UNAVAILABLE'
      )
    }
    let row = await UsisCommunicationSettings.find(organizationId)
    if (!row) {
      row = await UsisCommunicationSettings.create({
        organizationId,
        socialFeaturesEnabled: false,
        smsDeliveryMode,
      })
    } else {
      row.smsDeliveryMode = smsDeliveryMode
      await row.save()
    }
    return {
      organizationId,
      smsDeliveryMode: row.smsDeliveryMode,
      socialFeaturesEnabled: row.socialFeaturesEnabled,
    }
  }

  private async resolveStudentIds(organizationId: string, filters: MassSmsFilters): Promise<string[]> {
    let query = db
      .from(t('students'))
      .where(`${t('students')}.organization_id`, organizationId)
      .where(`${t('students')}.status`, 'active')
      .whereNull(`${t('students')}.deleted_at`)
      .whereNull(`${t('students')}.merged_into_student_id`)

    if (filters.yearLevels?.length) {
      query = query.whereIn(`${t('students')}.year_level`, filters.yearLevels)
    }
    if (filters.programIds?.length) {
      query = query.whereIn(`${t('students')}.program_id`, filters.programIds)
    }

    if (filters.educationalLevels?.length) {
      query = query
        .join(t('programs'), `${t('programs')}.id`, `${t('students')}.program_id`)
        .whereIn(`${t('programs')}.degree_level`, filters.educationalLevels)
    }

    if (filters.departmentCodes?.length) {
      const codes = filters.departmentCodes.map((c) => c.toUpperCase())
      const deptRows = await db
        .from(t('usis_academic_departments'))
        .where('organization_id', organizationId)
        .select('college_id', 'code')
      const ids = [
        ...new Set(
          deptRows
            .filter((r) => codes.includes(String(r.code ?? '').toUpperCase()))
            .map((r) => r.college_id as string)
            .filter(Boolean)
        ),
      ]
      if (!ids.length) return []
      if (!filters.educationalLevels?.length) {
        query = query.join(t('programs'), `${t('programs')}.id`, `${t('students')}.program_id`)
      }
      query = query.whereIn(`${t('programs')}.college_id`, ids)
    }

    if (filters.sectionCodes?.length) {
      const codes = filters.sectionCodes.map((c) => c.toUpperCase())
      const sectionRows = await db.from(t('sections')).where('organization_id', organizationId).select('id', 'code')
      const sectionIds = sectionRows
        .filter((r) => codes.includes(String(r.code ?? '').toUpperCase()))
        .map((r) => r.id as string)
      if (!sectionIds.length) return []
      const enrolled = await db
        .from(t('enrollment_lines'))
        .join(t('enrollments'), `${t('enrollments')}.id`, `${t('enrollment_lines')}.enrollment_id`)
        .whereIn(`${t('enrollment_lines')}.section_id`, sectionIds)
        .whereIn(`${t('enrollment_lines')}.status`, ['registered', 'enrolled'])
        .select(`${t('enrollments')}.student_id as student_id`)
      const allowed = new Set(enrolled.map((r) => r.student_id as string))
      const rows = await query.select(`${t('students')}.id as id`)
      return rows.map((r) => r.id as string).filter((id) => allowed.has(id))
    }

    const rows = await query.select(`${t('students')}.id as id`)
    return rows.map((r) => r.id as string)
  }

  async previewRecipients(input: {
    organizationId: string
    filters: MassSmsFilters
    recipientKinds?: MassSmsRecipientKind[]
  }) {
    const kinds = normalizeKinds(input.recipientKinds)
    const studentIds = await this.resolveStudentIds(input.organizationId, input.filters)
    let studentMobiles = 0
    let contactMobiles = 0

    if (kinds.includes('student') && studentIds.length) {
      const students = await Student.query()
        .whereIn('id', studentIds)
        .whereNotNull('mobile')
        .select('id', 'mobile')
      studentMobiles = students.filter((s) => Boolean(s.mobile?.trim())).length
    }

    const contactKinds = kinds.filter((k) => k !== 'student')
    if (contactKinds.length && studentIds.length) {
      const contacts = await UsisStudentContact.query()
        .where('organization_id', input.organizationId)
        .whereIn('student_id', studentIds)
        .whereIn('relation', contactKinds)
        .where('sms_opt_in', true)
        .whereNotNull('mobile')
      contactMobiles = contacts.filter((c) => Boolean(c.mobile?.trim())).length
    }

    return {
      matchedStudents: studentIds.length,
      studentMobiles,
      contactMobiles,
      recipientCount: studentMobiles + contactMobiles,
      recipientKinds: kinds,
      filters: input.filters,
    }
  }

  async queueMassSms(input: {
    organizationId: string
    userId: string
    title: string
    message: string
    filters?: MassSmsFilters
    recipientKinds?: MassSmsRecipientKind[]
    announcementId?: string | null
  }) {
    const message = input.message.trim()
    if (message.length < 1 || message.length > 640) {
      throw new EnrollmentWorkflowError('SMS message must be 1–640 characters', 422, 'INVALID_SMS_BODY')
    }
    const filters = input.filters ?? {}
    const preview = await this.previewRecipients({
      organizationId: input.organizationId,
      filters,
      recipientKinds: input.recipientKinds,
    })
    const deliveryMode = await this.getDeliveryMode(input.organizationId)
    const status = preview.recipientCount > 0 ? 'queued' : 'skipped'
    const row = await UsisMassSmsCampaign.create({
      organizationId: input.organizationId,
      title: input.title.trim() || 'Mass SMS',
      message,
      filters,
      recipientKinds: preview.recipientKinds,
      status,
      recipientCount: preview.recipientCount,
      deliveryMode,
      lastError: preview.recipientCount > 0 ? null : 'No matching recipients with mobile numbers for filters',
      announcementId: input.announcementId ?? null,
      requestedBy: input.userId,
      queuedAt: DateTime.now(),
      completedAt: null,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: AuditAction.CREATE,
      entityType: 'mass_sms_campaign',
      entityId: row.id,
      metadata: {
        recipientCount: row.recipientCount,
        status: row.status,
        deliveryMode,
        filters,
        recipientKinds: preview.recipientKinds,
      },
    })

    return { campaign: row, preview }
  }

  listCampaigns(organizationId: string, page: number, limit: number) {
    return UsisMassSmsCampaign.query()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }

  async upsertStudentContact(input: {
    organizationId: string
    studentId: string
    relation: MassSmsRecipientKind
    fullName: string
    mobile?: string | null
    email?: string | null
    smsOptIn?: boolean
    actorUserId: string
  }) {
    if (!['parent', 'guardian', 'sponsor'].includes(input.relation)) {
      throw new EnrollmentWorkflowError('relation must be parent, guardian, or sponsor', 422, 'INVALID_RELATION')
    }
    const student = await Student.query()
      .where('id', input.studentId)
      .where('organization_id', input.organizationId)
      .firstOrFail()

    const row = await UsisStudentContact.create({
      organizationId: input.organizationId,
      studentId: student.id,
      relation: input.relation,
      fullName: input.fullName.trim(),
      mobile: input.mobile?.trim() || null,
      email: input.email?.trim() || null,
      smsOptIn: input.smsOptIn !== false,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.CREATE,
      entityType: 'student_contact',
      entityId: row.id,
      metadata: { studentId: student.id, relation: row.relation },
    })
    return row
  }

  audienceToMassFilters(audience: AnnouncementAudience): MassSmsFilters {
    return {
      yearLevels: audience.yearLevels,
      educationalLevels: audience.educationalLevels,
      departmentCodes: audience.departmentCodes,
      programIds: audience.programIds,
      sectionCodes: audience.sectionCodes,
    }
  }

  async queueFromAnnouncement(input: {
    organizationId: string
    userId: string
    announcementId: string
    title: string
    message: string
    audience: AnnouncementAudience
    recipientKinds?: MassSmsRecipientKind[]
  }) {
    return this.queueMassSms({
      organizationId: input.organizationId,
      userId: input.userId,
      title: input.title,
      message: input.message,
      filters: this.audienceToMassFilters(input.audience),
      recipientKinds: input.recipientKinds,
      announcementId: input.announcementId,
    })
  }
}

export const massCommsService = new MassCommsService()

export async function countFilteredSmsRecipients(
  organizationId: string,
  filters: AnnouncementAudience,
  recipientKinds: MassSmsRecipientKind[] = ['student']
) {
  const preview = await massCommsService.previewRecipients({
    organizationId,
    filters: massCommsService.audienceToMassFilters(filters),
    recipientKinds,
  })
  return preview.recipientCount
}
