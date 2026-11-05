import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import FacultyClassAssignment from '#modules/enrollment/models/faculty_class_assignment'
import Section from '#modules/enrollment/models/section'
import Subject from '#modules/enrollment/models/subject'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import UsisSectionWaitlistEntry from '#modules/enrollment/models/usis_section_waitlist_entry'
import { schedulingService } from '#modules/enrollment/services/scheduling_service'
import { schedulingNotificationService } from '#modules/enrollment/services/scheduling_notification_service'
import { waitlistService } from '#modules/enrollment/services/waitlist_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export class SlotAdminService {
  listMeetings(organizationId: string, sectionId: string) {
    return UsisSectionMeeting.query()
      .where('organization_id', organizationId)
      .where('section_id', sectionId)
      .orderBy('day_of_week', 'asc')
      .orderBy('start_minute', 'asc')
  }

  async enrolledStudentIds(organizationId: string, sectionId: string) {
    const lines = await EnrollmentLine.query()
      .where('organization_id', organizationId)
      .where('section_id', sectionId)
      .whereIn('status', ['planned', 'registered', 'enrolled'])
      .preload('enrollment')
    return [...new Set(lines.map((l) => l.enrollment?.studentId).filter(Boolean) as string[])]
  }

  async listSectionRoster(organizationId: string, sectionId: string) {
    const lines = await EnrollmentLine.query()
      .where('organization_id', organizationId)
      .where('section_id', sectionId)
      .whereIn('status', ['planned', 'registered', 'enrolled'])
      .preload('enrollment', (q) => q.preload('student'))
      .orderBy('created_at', 'asc')

    return lines.map((line) => {
      const student = line.enrollment?.student
      return {
        enrollmentLineId: line.id,
        enrollmentId: line.enrollmentId,
        status: line.status,
        studentId: student?.id ?? line.enrollment?.studentId ?? null,
        studentNumber: student?.studentNumber ?? null,
        studentName: student ? `${student.lastName}, ${student.firstName}` : null,
        subjectCode: line.subjectCode,
      }
    })
  }

  async createMeeting(input: {
    organizationId: string
    sectionId: string
    dayOfWeek: number
    startMinute: number
    endMinute: number
    roomCode?: string | null
    facultyUserId?: string | null
    actorUserId: string
  }) {
    if (input.endMinute <= input.startMinute) {
      throw new Error('endMinute must be after startMinute')
    }
    const section = await Section.query()
      .where('organization_id', input.organizationId)
      .where('id', input.sectionId)
      .firstOrFail()
    if (section.status === 'dissolved') throw new Error('Section is dissolved')

    const slotConflict = await schedulingService.detectMeetingSlotConflicts({
      organizationId: input.organizationId,
      sectionId: input.sectionId,
      dayOfWeek: input.dayOfWeek,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
      roomCode: input.roomCode ?? null,
      facultyUserId: input.facultyUserId ?? null,
    })
    if (!slotConflict.ok) {
      throw new Error(slotConflict.conflicts[0]?.message ?? 'Schedule conflict on meeting slot')
    }

    const row = await UsisSectionMeeting.create({
      organizationId: input.organizationId,
      sectionId: input.sectionId,
      dayOfWeek: input.dayOfWeek,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
      roomCode: input.roomCode ?? null,
      facultyUserId: input.facultyUserId ?? null,
    })

    const studentIds = await this.enrolledStudentIds(input.organizationId, input.sectionId)
    await schedulingNotificationService.notifySectionStakeholders({
      organizationId: input.organizationId,
      sectionId: input.sectionId,
      eventType: 'schedule_slot_added',
      title: 'Class meeting added',
      body: `A meeting slot was added to section ${section.code}.`,
      studentIds,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.CREATE,
      entityType: 'section_meeting',
      entityId: row.id,
    })
    return row
  }

  async updateMeeting(input: {
    organizationId: string
    meetingId: string
    patch: Partial<{
      dayOfWeek: number
      startMinute: number
      endMinute: number
      roomCode: string | null
      facultyUserId: string | null
    }>
    actorUserId: string
  }) {
    const row = await UsisSectionMeeting.query()
      .where('organization_id', input.organizationId)
      .where('id', input.meetingId)
      .firstOrFail()

    const nextDay = input.patch.dayOfWeek !== undefined ? input.patch.dayOfWeek : row.dayOfWeek
    const nextStart = input.patch.startMinute !== undefined ? input.patch.startMinute : row.startMinute
    const nextEnd = input.patch.endMinute !== undefined ? input.patch.endMinute : row.endMinute
    const nextRoom = input.patch.roomCode !== undefined ? input.patch.roomCode : row.roomCode
    const nextFaculty =
      input.patch.facultyUserId !== undefined ? input.patch.facultyUserId : row.facultyUserId
    const slotConflict = await schedulingService.detectMeetingSlotConflicts({
      organizationId: input.organizationId,
      sectionId: row.sectionId,
      dayOfWeek: nextDay,
      startMinute: nextStart,
      endMinute: nextEnd,
      roomCode: nextRoom,
      facultyUserId: nextFaculty,
      excludeMeetingId: row.id,
    })
    if (!slotConflict.ok) {
      throw new Error(slotConflict.conflicts[0]?.message ?? 'Schedule conflict on meeting slot')
    }

    if (input.patch.dayOfWeek !== undefined) row.dayOfWeek = input.patch.dayOfWeek
    if (input.patch.startMinute !== undefined) row.startMinute = input.patch.startMinute
    if (input.patch.endMinute !== undefined) row.endMinute = input.patch.endMinute
    if (input.patch.roomCode !== undefined) row.roomCode = input.patch.roomCode
    if (input.patch.facultyUserId !== undefined) row.facultyUserId = input.patch.facultyUserId
    if (row.endMinute <= row.startMinute) throw new Error('endMinute must be after startMinute')
    await row.save()

    const section = await Section.findOrFail(row.sectionId)
    const studentIds = await this.enrolledStudentIds(input.organizationId, row.sectionId)
    await schedulingNotificationService.notifySectionStakeholders({
      organizationId: input.organizationId,
      sectionId: row.sectionId,
      eventType: 'schedule_updated',
      title: 'Class schedule updated',
      body: `Meeting times or room assignments changed for section ${section.code}.`,
      studentIds,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'section_meeting',
      entityId: row.id,
    })

    return row
  }

  async deleteMeeting(input: { organizationId: string; meetingId: string; actorUserId: string }) {
    const row = await UsisSectionMeeting.query()
      .where('organization_id', input.organizationId)
      .where('id', input.meetingId)
      .firstOrFail()
    const sectionId = row.sectionId
    const section = await Section.findOrFail(sectionId)
    const studentIds = await this.enrolledStudentIds(input.organizationId, sectionId)
    await row.delete()

    await schedulingNotificationService.notifySectionStakeholders({
      organizationId: input.organizationId,
      sectionId,
      eventType: 'schedule_slot_removed',
      title: 'Class meeting removed',
      body: `A meeting slot was removed from section ${section.code}.`,
      studentIds,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.DELETE,
      entityType: 'section_meeting',
      entityId: input.meetingId,
    })
  }

  async dropEnrollmentLine(input: {
    organizationId: string
    enrollmentLineId: string
    actorUserId: string
    reason?: string | null
  }) {
    return db.transaction(async (trx) => {
      const line = await EnrollmentLine.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('id', input.enrollmentLineId)
        .preload('enrollment')
        .forUpdate()
        .firstOrFail()

      if (!line.sectionId) {
        throw new Error('Enrollment line is not tied to a section')
      }
      if (line.status === 'dropped') {
        throw new Error('Enrollment line already dropped')
      }

      const section = await Section.query({ client: trx }).where('id', line.sectionId).firstOrFail()
      await line.useTransaction(trx).merge({ status: 'dropped' }).save()

      const enrollment = line.enrollment
      const studentId = enrollment?.studentId

      if (studentId) {
        await schedulingNotificationService.notifyStudent({
          organizationId: input.organizationId,
          studentId,
          sectionId: section.id,
          eventType: 'dropped_from_section',
          title: 'Removed from class section',
          body: input.reason?.trim()
            ? `You were dropped from section ${section.code}: ${input.reason.trim()}`
            : `You were dropped from section ${section.code} by the registrar.`,
        })
      }

      await schedulingNotificationService.notifySectionStakeholders({
        organizationId: input.organizationId,
        sectionId: section.id,
        eventType: 'student_dropped',
        title: 'Student dropped from section',
        body: `A student was dropped from section ${section.code}.`,
        studentIds: [],
      })

      const promoted = await waitlistService.promoteNextIfSeatAvailable({
        organizationId: input.organizationId,
        sectionId: section.id,
        actorUserId: input.actorUserId,
        trx,
      })

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: AuditAction.UPDATE,
        entityType: 'enrollment_line',
        entityId: line.id,
      })

      return { line, promotedWaitlistEntryId: promoted?.id ?? null }
    })
  }

  async transferEnrollmentLine(input: {
    organizationId: string
    enrollmentLineId: string
    toSectionId: string
    actorUserId: string
  }) {
    return db.transaction(async (trx) => {
      const line = await EnrollmentLine.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('id', input.enrollmentLineId)
        .preload('enrollment')
        .forUpdate()
        .firstOrFail()

      if (!line.sectionId) throw new Error('Enrollment line is not tied to a section')
      const fromSectionId = line.sectionId
      const fromSection = await Section.query({ client: trx }).where('id', fromSectionId).firstOrFail()
      const enrollment = line.enrollment
      if (!enrollment) throw new Error('Enrollment not found for line')

      const target = await Section.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('id', input.toSectionId)
        .firstOrFail()
      if (target.status === 'dissolved') throw new Error('Target section is dissolved')

      const conflict = await schedulingService.detectConflicts({
        organizationId: input.organizationId,
        studentId: enrollment.studentId,
        candidateSectionId: input.toSectionId,
        excludeSectionId: fromSectionId,
      })
      if (!conflict.ok) {
        throw new Error(conflict.conflicts[0]?.message ?? 'Schedule conflict on transfer')
      }

      const seated = await schedulingService.seatedCount(target.id)
      const capacity = target.capacity ?? 0
      if (capacity > 0 && seated >= capacity) {
        throw new Error('Target section is at capacity')
      }

      line.useTransaction(trx)
      line.sectionId = target.id
      if (target.subjectId) {
        const subject = await Subject.find(target.subjectId, { client: trx })
        if (subject) {
          line.subjectId = subject.id
          line.subjectCode = subject.subjectCode
          line.subjectTitle = subject.title
          line.units = subject.units
        }
      }
      await line.save()

      await schedulingNotificationService.notifyStudent({
        organizationId: input.organizationId,
        studentId: enrollment.studentId,
        sectionId: target.id,
        eventType: 'section_transfer',
        title: 'Section transfer',
        body: `Your enrollment was moved to section ${target.code}.`,
      })

      await schedulingNotificationService.notifySectionStakeholders({
        organizationId: input.organizationId,
        sectionId: fromSectionId,
        eventType: 'student_transferred_out',
        title: 'Student transferred out',
        body: `A student was transferred out of section ${fromSection.code}.`,
        studentIds: [],
      })
      await schedulingNotificationService.notifySectionStakeholders({
        organizationId: input.organizationId,
        sectionId: target.id,
        eventType: 'student_transferred_in',
        title: 'Student transferred in',
        body: `A student was transferred into section ${target.code}.`,
        studentIds: [],
      })

      await waitlistService.promoteNextIfSeatAvailable({
        organizationId: input.organizationId,
        sectionId: fromSectionId,
        actorUserId: input.actorUserId,
        trx,
      })

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: AuditAction.UPDATE,
        entityType: 'enrollment_line',
        entityId: line.id,
      })

      return { line, fromSectionId, toSectionId: target.id }
    })
  }

  async dissolveSection(input: {
    organizationId: string
    sectionId: string
    actorUserId: string
    reason?: string | null
  }) {
    return db.transaction(async (trx) => {
      const section = await Section.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('id', input.sectionId)
        .forUpdate()
        .firstOrFail()

      if (section.status === 'dissolved') {
        throw new Error('Section already dissolved')
      }

      const lines = await EnrollmentLine.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('section_id', section.id)
        .whereIn('status', ['planned', 'registered', 'enrolled'])
        .preload('enrollment')

      const studentIds = [...new Set(lines.map((l) => l.enrollment?.studentId).filter(Boolean) as string[])]

      for (const line of lines) {
        line.useTransaction(trx)
        line.status = 'dropped'
        await line.save()
      }

      const waitlistRows = await UsisSectionWaitlistEntry.query({ client: trx })
        .where('section_id', section.id)
        .where('status', 'waiting')
      for (const w of waitlistRows) {
        w.useTransaction(trx)
        w.status = 'cancelled'
        await w.save()
        await schedulingNotificationService.notifyStudent({
          organizationId: input.organizationId,
          studentId: w.studentId,
          sectionId: section.id,
          eventType: 'waitlist_cancelled',
          title: 'Waitlist cancelled',
          body: `Waitlist for section ${section.code} was cancelled because the class was dissolved.`,
        })
      }

      section.useTransaction(trx)
      section.status = 'dissolved'
      await section.save()

      await FacultyClassAssignment.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('section_id', section.id)
        .where('is_active', true)
        .update({ is_active: false, updated_at: DateTime.now().toSQL() })

      const reasonText = input.reason?.trim()
        ? input.reason.trim()
        : 'The registrar dissolved this class section.'
      await schedulingNotificationService.notifySectionStakeholders({
        organizationId: input.organizationId,
        sectionId: section.id,
        eventType: 'section_dissolved',
        title: 'Class dissolved',
        body: reasonText.includes(section.code)
          ? reasonText
          : `Section ${section.code} was dissolved. ${reasonText}`,
        studentIds,
      })

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: AuditAction.UPDATE,
        entityType: 'section',
        entityId: section.id,
      })

      const enrollmentIds = [...new Set(lines.map((l) => l.enrollmentId).filter(Boolean))]

      return {
        section,
        affectedStudents: studentIds.length,
        droppedLines: lines.length,
        enrollmentIds,
      }
    })
  }
}

export const slotAdminService = new SlotAdminService()
