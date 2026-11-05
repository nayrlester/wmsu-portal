import UsisSchedulingNotification from '#modules/enrollment/models/usis_scheduling_notification'
import FacultyClassAssignment from '#modules/enrollment/models/faculty_class_assignment'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import Section from '#modules/enrollment/models/section'

export class SchedulingNotificationService {
  async notifyStudent(input: {
    organizationId: string
    studentId: string
    sectionId: string | null
    eventType: string
    title: string
    body: string
  }) {
    return UsisSchedulingNotification.create({
      organizationId: input.organizationId,
      studentId: input.studentId,
      sectionId: input.sectionId,
      facultyUserId: null,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
    })
  }

  async notifyFacultyUser(input: {
    organizationId: string
    facultyUserId: string
    sectionId: string | null
    eventType: string
    title: string
    body: string
  }) {
    return UsisSchedulingNotification.create({
      organizationId: input.organizationId,
      studentId: null,
      sectionId: input.sectionId,
      facultyUserId: input.facultyUserId,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
    })
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
}

export const schedulingNotificationService = new SchedulingNotificationService()
