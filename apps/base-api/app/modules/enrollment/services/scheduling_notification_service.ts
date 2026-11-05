import { DateTime } from 'luxon'
import UsisSchedulingNotification from '#modules/enrollment/models/usis_scheduling_notification'
import FacultyClassAssignment from '#modules/enrollment/models/faculty_class_assignment'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import Section from '#modules/enrollment/models/section'
import Student from '#modules/enrollment/models/student'
import User from '#modules/enrollment/models/user'
import { emailJsMailerService } from '#modules/common-platform/services/emailjs_mailer_service'

export class SchedulingNotificationService {
  private async sendEmailSafe(input: {
    toEmail?: string | null
    toName?: string | null
    subject: string
    message: string
    eventType: string
  }) {
    const to = input.toEmail?.trim()
    if (!to || !emailJsMailerService.isConfigured()) return
    try {
      await emailJsMailerService.send({
        toEmail: to,
        toName: input.toName,
        subject: input.subject,
        message: input.message,
        extraParams: {
          event_type: input.eventType,
          channel: 'scheduling',
        },
      })
    } catch {
      return
    }
  }

  async notifyStudent(input: {
    organizationId: string
    studentId: string
    sectionId: string | null
    eventType: string
    title: string
    body: string
  }) {
    const row = await UsisSchedulingNotification.create({
      organizationId: input.organizationId,
      studentId: input.studentId,
      sectionId: input.sectionId,
      facultyUserId: null,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
    })

    const student = await Student.query()
      .where('organization_id', input.organizationId)
      .where('id', input.studentId)
      .first()
    if (student?.email) {
      await this.sendEmailSafe({
        toEmail: student.email,
        toName: `${student.firstName} ${student.lastName}`.trim(),
        subject: input.title,
        message: input.body,
        eventType: input.eventType,
      })
    }

    return row
  }

  async notifyFacultyUser(input: {
    organizationId: string
    facultyUserId: string
    sectionId: string | null
    eventType: string
    title: string
    body: string
  }) {
    const row = await UsisSchedulingNotification.create({
      organizationId: input.organizationId,
      studentId: null,
      sectionId: input.sectionId,
      facultyUserId: input.facultyUserId,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
    })

    const user = await User.query()
      .where('organization_id', input.organizationId)
      .where('id', input.facultyUserId)
      .first()
    if (user?.email) {
      await this.sendEmailSafe({
        toEmail: user.email,
        toName: user.fullName,
        subject: input.title,
        message: input.body,
        eventType: input.eventType,
      })
    }

    return row
  }

  async notifySectionStakeholders(input: {
    organizationId: string
    sectionId: string
    eventType: string
    title: string
    body: string
    studentIds?: string[]
  }) {
    const section = await Section.query()
      .where('organization_id', input.organizationId)
      .where('id', input.sectionId)
      .first()
    const code = section?.code ?? input.sectionId
    const fullBody = input.body.includes(code) ? input.body : `${input.body} (Section ${code})`

    const facultyIds = new Set<string>()
    const assignments = await FacultyClassAssignment.query()
      .where('organization_id', input.organizationId)
      .where('section_id', input.sectionId)
      .where('is_active', true)
    for (const a of assignments) facultyIds.add(a.facultyUserId)

    const meetings = await UsisSectionMeeting.query()
      .where('organization_id', input.organizationId)
      .where('section_id', input.sectionId)
    for (const m of meetings) {
      if (m.facultyUserId) facultyIds.add(m.facultyUserId)
    }

    const rows: UsisSchedulingNotification[] = []
    for (const studentId of input.studentIds ?? []) {
      rows.push(
        await this.notifyStudent({
          organizationId: input.organizationId,
          studentId,
          sectionId: input.sectionId,
          eventType: input.eventType,
          title: input.title,
          body: fullBody,
        })
      )
    }
    for (const facultyUserId of facultyIds) {
      rows.push(
        await this.notifyFacultyUser({
          organizationId: input.organizationId,
          facultyUserId,
          sectionId: input.sectionId,
          eventType: input.eventType,
          title: input.title,
          body: fullBody,
        })
      )
    }
    return rows
  }

  listForStudent(organizationId: string, studentId: string, limit = 20) {
    return UsisSchedulingNotification.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  listForFaculty(organizationId: string, facultyUserId: string, limit = 20) {
    return UsisSchedulingNotification.query()
      .where('organization_id', organizationId)
      .where('faculty_user_id', facultyUserId)
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  async markRead(input: {
    organizationId: string
    notificationId: string
    studentId?: string | null
    facultyUserId: string
  }) {
    const row = await UsisSchedulingNotification.query()
      .where('organization_id', input.organizationId)
      .where('id', input.notificationId)
      .firstOrFail()
    const asStudent = Boolean(input.studentId && row.studentId === input.studentId)
    const asFaculty = row.facultyUserId === input.facultyUserId
    if (!asStudent && !asFaculty) {
      throw new Error('Notification not found for this user')
    }
    if (!row.readAt) {
      row.readAt = DateTime.now()
      await row.save()
    }
    return row
  }
}

export const schedulingNotificationService = new SchedulingNotificationService()
