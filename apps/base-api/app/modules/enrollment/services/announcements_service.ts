import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import UsisAnnouncement, { type AnnouncementAudience } from '#modules/enrollment/models/usis_announcement'
import UsisAnnouncementReaction from '#modules/enrollment/models/usis_announcement_reaction'
import UsisCommunicationSettings from '#modules/enrollment/models/usis_communication_settings'
import Student from '#modules/enrollment/models/student'
import User from '#modules/enrollment/models/user'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import { t } from '#modules/enrollment/helpers/db_schema'
import { emailJsMailerService } from '#modules/common-platform/services/emailjs_mailer_service'

export type FeedContext = {
  identityRoles: string[]
  localRoleSlugs: string[]
  student: Student | null
}

function normalizeList(values?: string[]): string[] {
  if (!values?.length) return []
  return values.map((v) => v.toLowerCase().trim()).filter(Boolean)
}

export function audienceMatches(audience: AnnouncementAudience, ctx: FeedContext): boolean {
  const roleFilter = normalizeList(audience.roles)
  if (roleFilter.length) {
    const userRoles = [
      ...ctx.identityRoles.map((r) => r.toLowerCase()),
      ...ctx.localRoleSlugs.map((r) => r.toLowerCase()),
    ]
    if (ctx.student) userRoles.push('student')
    if (!roleFilter.some((r) => userRoles.includes(r))) return false
  }

  if (ctx.student) {
    const programIds = audience.programIds ?? []
    if (programIds.length && ctx.student.programId && !programIds.includes(ctx.student.programId)) {
      return false
    }
    const yearLevels = audience.yearLevels ?? []
    if (yearLevels.length && ctx.student.yearLevel != null && !yearLevels.includes(ctx.student.yearLevel)) {
      return false
    }
  }

  return true
}

function isVisibleNow(row: UsisAnnouncement, now: DateTime): boolean {
  if (row.status !== 'published' && row.status !== 'scheduled') return false
  if (row.publishAt && row.publishAt > now) return false
  if (row.expiresAt && row.expiresAt <= now) {
    return false
  }
  return row.deliverPortal
}

export class AnnouncementsService {
  async getSettings(organizationId: string) {
    let row = await UsisCommunicationSettings.find(organizationId)
    if (!row) {
      row = await UsisCommunicationSettings.create({
        organizationId,
        socialFeaturesEnabled: false,
        smsDeliveryMode: 'queue_only',
      })
    }
    return row
  }

  async updateSettings(organizationId: string, socialFeaturesEnabled: boolean) {
    const row = await this.getSettings(organizationId)
    row.socialFeaturesEnabled = socialFeaturesEnabled
    await row.save()
    return row
  }

  async listAdmin(organizationId: string, page: number, limit: number) {
    return UsisAnnouncement.query()
      .where('organization_id', organizationId)
      .orderBy('is_pinned', 'desc')
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }

  async create(input: {
    organizationId: string
    userId: string
    title: string
    body: string
    audience?: AnnouncementAudience
    isPinned?: boolean
    publishAt?: Date | null
    expiresAt?: Date | null
    deliverPortal?: boolean
    deliverEmail?: boolean
    deliverSms?: boolean
    publishNow?: boolean
  }) {
    const now = DateTime.now()
    const publishAt = input.publishAt ? DateTime.fromJSDate(input.publishAt) : input.publishNow ? now : null
    const status = input.publishNow || (publishAt && publishAt <= now) ? 'published' : publishAt ? 'scheduled' : 'draft'

    const row = await UsisAnnouncement.create({
      organizationId: input.organizationId,
      title: input.title,
      body: input.body,
      audience: input.audience ?? {},
      isPinned: input.isPinned ?? false,
      publishAt,
      expiresAt: input.expiresAt ? DateTime.fromJSDate(input.expiresAt) : null,
      deliverPortal: input.deliverPortal ?? true,
      deliverEmail: input.deliverEmail ?? false,
      deliverSms: input.deliverSms ?? false,
      status,
      createdBy: input.userId,
      updatedBy: input.userId,
    })

    if (row.status === 'published' && row.deliverEmail) {
      void this.deliverAnnouncementEmails(row).catch(() => undefined)
    }

    return row
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    patch: Partial<{
      title: string
      body: string
      audience: AnnouncementAudience
      isPinned: boolean
      publishAt: Date | null
      expiresAt: Date | null
      deliverPortal: boolean
      deliverEmail: boolean
      deliverSms: boolean
      status: string
    }>
  ) {
    const row = await UsisAnnouncement.query().where('id', id).where('organization_id', organizationId).firstOrFail()
    if (patch.title !== undefined) row.title = patch.title
    if (patch.body !== undefined) row.body = patch.body
    if (patch.audience !== undefined) row.audience = patch.audience
    if (patch.isPinned !== undefined) row.isPinned = patch.isPinned
    if (patch.deliverPortal !== undefined) row.deliverPortal = patch.deliverPortal
    if (patch.deliverEmail !== undefined) row.deliverEmail = patch.deliverEmail
    if (patch.deliverSms !== undefined) row.deliverSms = patch.deliverSms
    if (patch.publishAt !== undefined) {
      row.publishAt = patch.publishAt ? DateTime.fromJSDate(patch.publishAt) : null
    }
    if (patch.expiresAt !== undefined) {
      row.expiresAt = patch.expiresAt ? DateTime.fromJSDate(patch.expiresAt) : null
    }
    if (patch.status !== undefined) row.status = patch.status
    row.updatedBy = userId
    await row.save()
    return row
  }

  async publish(id: string, organizationId: string, userId: string) {
    const row = await this.update(id, organizationId, userId, {
      status: 'published',
      publishAt: new Date(),
    })
    if (row.deliverEmail) {
      void this.deliverAnnouncementEmails(row).catch(() => undefined)
    }
    return row
  }

  private async listEmailRecipients(organizationId: string, filters: AnnouncementAudience) {
    let query = Student.query()
      .where('organization_id', organizationId)
      .where('status', 'active')
      .whereNotNull('email')
    if (filters.programIds?.length) query = query.whereIn('program_id', filters.programIds)
    if (filters.yearLevels?.length) query = query.whereIn('year_level', filters.yearLevels)
    return query.orderBy('created_at', 'asc').limit(200)
  }

  async deliverAnnouncementEmails(announcement: UsisAnnouncement) {
    if (!emailJsMailerService.isConfigured()) return { sent: 0, skipped: true as const }

    const students = await this.listEmailRecipients(
      announcement.organizationId,
      announcement.audience ?? {}
    )
    const payloads = students
      .filter((s) => Boolean(s.email?.trim()))
      .map((s) => ({
        toEmail: s.email.trim(),
        toName: `${s.firstName} ${s.lastName}`.trim(),
        subject: announcement.title,
        message: announcement.body,
        extraParams: {
          announcement_id: announcement.id,
          channel: 'announcement',
        },
      }))

    if (!payloads.length) return { sent: 0, skipped: false as const }

    const results = await emailJsMailerService.sendMany(payloads)
    return { sent: results.filter((r) => r.success).length, skipped: false as const }
  }

  async archive(id: string, organizationId: string, userId: string) {
    return this.update(id, organizationId, userId, { status: 'archived' })
  }

  async feed(organizationId: string, ctx: FeedContext, limit = 20, viewerUserId?: string) {
    const now = DateTime.now()
    const settings = await this.getSettings(organizationId)
    const rows = await UsisAnnouncement.query()
      .where('organization_id', organizationId)
      .whereIn('status', ['published', 'scheduled'])
      .where('deliver_portal', true)
      .orderBy('is_pinned', 'desc')
      .orderBy('publish_at', 'desc')
      .limit(100)

    const visible = rows
      .filter((r) => isVisibleNow(r, now) && audienceMatches(r.audience ?? {}, ctx))
      .slice(0, limit)

    if (!settings.socialFeaturesEnabled || !visible.length) {
      return visible.map((row) => ({
        ...row.serialize(),
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        comments: [] as Array<{ id: string; body: string | null; userId: string; createdAt: string | null }>,
      }))
    }

    const ids = visible.map((r) => r.id)
    const reactions = await UsisAnnouncementReaction.query()
      .where('organization_id', organizationId)
      .whereIn('announcement_id', ids)
      .orderBy('created_at', 'asc')

    return visible.map((row) => {
      const forRow = reactions.filter((r) => r.announcementId === row.id)
      const likes = forRow.filter((r) => r.kind === 'like')
      const comments = forRow.filter((r) => r.kind === 'comment')
      return {
        ...row.serialize(),
        likeCount: likes.length,
        commentCount: comments.length,
        likedByMe: viewerUserId ? likes.some((l) => l.userId === viewerUserId) : false,
        comments: comments.slice(-5).map((c) => ({
          id: c.id,
          body: c.body,
          userId: c.userId,
          createdAt: c.createdAt?.toISO() ?? null,
        })),
      }
    })
  }

  async assertSocialEnabled(organizationId: string) {
    const settings = await this.getSettings(organizationId)
    if (!settings.socialFeaturesEnabled) {
      throw new EnrollmentWorkflowError(
        'Social features are disabled for this organization (ENR-035)',
        409,
        'SOCIAL_DISABLED'
      )
    }
    return settings
  }

  async toggleLike(organizationId: string, announcementId: string, userId: string) {
    await this.assertSocialEnabled(organizationId)
    const announcement = await UsisAnnouncement.query()
      .where('id', announcementId)
      .where('organization_id', organizationId)
      .firstOrFail()

    const existing = await UsisAnnouncementReaction.query()
      .where('announcement_id', announcement.id)
      .where('user_id', userId)
      .where('kind', 'like')
      .first()

    if (existing) {
      await existing.delete()
      return { liked: false, announcementId: announcement.id }
    }

    await UsisAnnouncementReaction.create({
      organizationId,
      announcementId: announcement.id,
      userId,
      kind: 'like',
      body: null,
    })
    return { liked: true, announcementId: announcement.id }
  }

  async addComment(organizationId: string, announcementId: string, userId: string, body: string) {
    await this.assertSocialEnabled(organizationId)
    const text = body.trim()
    if (text.length < 1 || text.length > 2000) {
      throw new EnrollmentWorkflowError('Comment must be 1–2000 characters', 422, 'INVALID_COMMENT')
    }
    const announcement = await UsisAnnouncement.query()
      .where('id', announcementId)
      .where('organization_id', organizationId)
      .firstOrFail()

    const row = await UsisAnnouncementReaction.create({
      organizationId,
      announcementId: announcement.id,
      userId,
      kind: 'comment',
      body: text,
    })
    return row
  }

  async resolveStudentForUser(organizationId: string, email: string | undefined) {
    if (!email) return null
    return Student.query()
      .where('organization_id', organizationId)
      .whereRaw('LOWER(email) = ?', [email.trim().toLowerCase()])
      .first()
  }

  async countSmsRecipients(organizationId: string, filters: AnnouncementAudience) {
    const { countFilteredSmsRecipients } = await import('#modules/enrollment/services/mass_comms_service')
    return countFilteredSmsRecipients(organizationId, filters, ['student'])
  }

  async queueMassDelivery(input: {
    organizationId: string
    announcementId: string
    channel: 'sms' | 'email'
    requestedBy: string
    filters: AnnouncementAudience
    recipientKinds?: Array<'student' | 'parent' | 'guardian' | 'sponsor'>
  }) {
    const announcement = await UsisAnnouncement.query()
      .where('id', input.announcementId)
      .where('organization_id', input.organizationId)
      .firstOrFail()

    const { countFilteredSmsRecipients, massCommsService } = await import(
      '#modules/enrollment/services/mass_comms_service'
    )

    const recipientCount =
      input.channel === 'sms'
        ? await countFilteredSmsRecipients(
            input.organizationId,
            input.filters,
            input.recipientKinds ?? ['student']
          )
        : await this.countEmailRecipients(input.organizationId, input.filters)

    await db.table(t('usis_announcement_deliveries')).insert({
      id: randomUUID(),
      organization_id: input.organizationId,
      announcement_id: announcement.id,
      channel: input.channel,
      status: recipientCount > 0 ? 'queued' : 'skipped',
      recipient_count: recipientCount,
      filters: JSON.stringify(input.filters ?? {}),
      last_error: recipientCount > 0 ? null : 'No matching recipients for filters',
      queued_at: new Date(),
      completed_at: null,
      requested_by: input.requestedBy,
    })

    if (input.channel === 'sms' && recipientCount > 0) {
      await massCommsService.queueFromAnnouncement({
        organizationId: input.organizationId,
        userId: input.requestedBy,
        announcementId: announcement.id,
        title: announcement.title,
        message: announcement.body.slice(0, 640),
        audience: input.filters,
        recipientKinds: input.recipientKinds ?? ['student'],
      })
    }

    if (input.channel === 'email' && recipientCount > 0) {
      void this.deliverAnnouncementEmails(announcement).catch(() => undefined)
    }

    return { recipientCount, status: recipientCount > 0 ? 'queued' : 'skipped' }
  }

  async countEmailRecipients(organizationId: string, filters: AnnouncementAudience) {
    let query = Student.query().where('organization_id', organizationId).where('status', 'active')
    if (filters.programIds?.length) query = query.whereIn('program_id', filters.programIds)
    if (filters.yearLevels?.length) query = query.whereIn('year_level', filters.yearLevels)
    const result = await query.count('* as total')
    return Number(result[0]?.$extras.total ?? 0)
  }

  async linkDemoIdentityStudent(organizationId: string, email: string, studentNumber: string) {
    const existing = await Student.query()
      .where('organization_id', organizationId)
      .whereRaw('LOWER(email) = ?', [email.toLowerCase()])
      .first()
    if (existing) return existing

    const any = await Student.query().where('organization_id', organizationId).where('student_number', studentNumber).first()
    if (any) {
      any.email = email.toLowerCase()
      await any.save()
      return any
    }

    const first = await Student.query().where('organization_id', organizationId).orderBy('created_at', 'asc').first()
    if (first) {
      first.email = email.toLowerCase()
      await first.save()
      return first
    }
    return null
  }

  async loadUserRoleSlugs(user: User) {
    await user.load('roles')
    return user.roles.map((r) => r.slug)
  }
}

export const announcementsService = new AnnouncementsService()
