import db from '@adonisjs/lucid/services/db'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import FacultyClassAssignment from '#modules/enrollment/models/faculty_class_assignment'
import Section from '#modules/enrollment/models/section'
import Subject from '#modules/enrollment/models/subject'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import { t } from '#modules/enrollment/helpers/db_schema'

const LINE_SEAT_STATUSES = ['planned', 'registered', 'enrolled'] as const

export type ScheduleConflict = {
  kind: 'student' | 'faculty' | 'room'
  message: string
  sectionId: string
  otherSectionId: string
  dayOfWeek: number
  startMinute: number
  endMinute: number
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

export class SchedulingService {
  async meetingsForSections(organizationId: string, sectionIds: string[]) {
    if (!sectionIds.length) return []
    return UsisSectionMeeting.query().where('organization_id', organizationId).whereIn('section_id', sectionIds)
  }

  async seatedCount(sectionId: string) {
    const rows = await EnrollmentLine.query()
      .where('section_id', sectionId)
      .whereIn('status', [...LINE_SEAT_STATUSES])
    return rows.length
  }

  async sectionSummary(organizationId: string, sectionId: string) {
    const section = await Section.query().where('organization_id', organizationId).where('id', sectionId).firstOrFail()
    const seated = await this.seatedCount(sectionId)
    const capacity = section.capacity ?? 0
    const waitlist = await db
      .from(t('usis_section_waitlist_entries'))
      .where('section_id', sectionId)
      .where('status', 'waiting')
      .count('* as total')
    const waitlistCount = Number((waitlist[0] as { total: string | number })?.total ?? 0)
    const meetings = await this.meetingsForSections(organizationId, [sectionId])
    return {
      sectionId: section.id,
      sectionCode: section.code,
      capacity,
      seated,
      seatsAvailable: capacity > 0 ? Math.max(0, capacity - seated) : null,
      atCapacity: capacity > 0 && seated >= capacity,
      waitlistEnabled: section.waitlistEnabled,
      waitlistCount,
      meetings: meetings.map((m) => ({
        dayOfWeek: m.dayOfWeek,
        startMinute: m.startMinute,
        endMinute: m.endMinute,
        roomCode: m.roomCode,
        facultyUserId: m.facultyUserId,
      })),
    }
  }

  async studentSectionIds(organizationId: string, studentId: string, excludeSectionId?: string) {
    const rows = await db
      .from(t('enrollment_lines'))
      .join(t('enrollments'), `${t('enrollments')}.id`, `${t('enrollment_lines')}.enrollment_id`)
      .where(`${t('enrollments')}.organization_id`, organizationId)
      .where(`${t('enrollments')}.student_id`, studentId)
      .whereIn(`${t('enrollment_lines')}.status`, [...LINE_SEAT_STATUSES])
      .whereNotNull(`${t('enrollment_lines')}.section_id`)
      .select(`${t('enrollment_lines')}.section_id as section_id`)
    const ids = rows.map((r) => r.section_id as string).filter((id) => id !== excludeSectionId)
    return [...new Set(ids)]
  }

  async detectMeetingSlotConflicts(input: {
    organizationId: string
    sectionId: string
    dayOfWeek: number
    startMinute: number
    endMinute: number
    roomCode?: string | null
    facultyUserId?: string | null
    excludeMeetingId?: string | null
  }) {
    const conflicts: ScheduleConflict[] = []
    if (input.endMinute <= input.startMinute) {
      return {
        ok: false,
        conflicts: [
          {
            kind: 'room' as const,
            message: 'endMinute must be after startMinute',
            sectionId: input.sectionId,
            otherSectionId: input.sectionId,
            dayOfWeek: input.dayOfWeek,
            startMinute: input.startMinute,
            endMinute: input.endMinute,
          },
        ],
      }
    }

    if (input.roomCode?.trim()) {
      const roomPeers = await UsisSectionMeeting.query()
        .where('organization_id', input.organizationId)
        .where('room_code', input.roomCode.trim())
        .where('day_of_week', input.dayOfWeek)
        .whereNot('section_id', input.sectionId)
      for (const b of roomPeers) {
        if (input.excludeMeetingId && b.id === input.excludeMeetingId) continue
        if (!overlaps(input.startMinute, input.endMinute, b.startMinute, b.endMinute)) continue
        conflicts.push({
          kind: 'room',
          message: `Room ${input.roomCode.trim()} conflict with section ${b.sectionId} on day ${input.dayOfWeek}`,
          sectionId: input.sectionId,
          otherSectionId: b.sectionId,
          dayOfWeek: input.dayOfWeek,
          startMinute: Math.max(input.startMinute, b.startMinute),
          endMinute: Math.min(input.endMinute, b.endMinute),
        })
      }
    }

    const facultyIds = new Set<string>()
    if (input.facultyUserId) facultyIds.add(input.facultyUserId)
    const assignments = await FacultyClassAssignment.query()
      .where('organization_id', input.organizationId)
      .where('section_id', input.sectionId)
      .where('is_active', true)
    for (const a of assignments) facultyIds.add(a.facultyUserId)

    for (const facultyUserId of facultyIds) {
      const facultyMeetings = await UsisSectionMeeting.query()
        .where('organization_id', input.organizationId)
        .where('faculty_user_id', facultyUserId)
        .where('day_of_week', input.dayOfWeek)
        .whereNot('section_id', input.sectionId)
      for (const b of facultyMeetings) {
        if (input.excludeMeetingId && b.id === input.excludeMeetingId) continue
        if (!overlaps(input.startMinute, input.endMinute, b.startMinute, b.endMinute)) continue
        conflicts.push({
          kind: 'faculty',
          message: `Faculty schedule overlap on day ${input.dayOfWeek}`,
          sectionId: input.sectionId,
          otherSectionId: b.sectionId,
          dayOfWeek: input.dayOfWeek,
          startMinute: Math.max(input.startMinute, b.startMinute),
          endMinute: Math.min(input.endMinute, b.endMinute),
        })
      }

      const otherAssignments = await FacultyClassAssignment.query()
        .where('organization_id', input.organizationId)
        .where('faculty_user_id', facultyUserId)
        .where('is_active', true)
        .whereNot('section_id', input.sectionId)
      const otherIds = otherAssignments.map((o) => o.sectionId)
      const otherMeetings = await this.meetingsForSections(input.organizationId, otherIds)
      for (const b of otherMeetings) {
        if (b.dayOfWeek !== input.dayOfWeek) continue
        if (!overlaps(input.startMinute, input.endMinute, b.startMinute, b.endMinute)) continue
        conflicts.push({
          kind: 'faculty',
          message: `Faculty schedule overlap on day ${input.dayOfWeek}`,
          sectionId: input.sectionId,
          otherSectionId: b.sectionId,
          dayOfWeek: input.dayOfWeek,
          startMinute: Math.max(input.startMinute, b.startMinute),
          endMinute: Math.min(input.endMinute, b.endMinute),
        })
      }
    }

    return { ok: conflicts.length === 0, conflicts }
  }

  async detectConflicts(input: {
    organizationId: string
    studentId: string
    candidateSectionId: string
    excludeSectionId?: string
  }) {
    const conflicts: ScheduleConflict[] = []
    const existingIds = await this.studentSectionIds(
      input.organizationId,
      input.studentId,
      input.excludeSectionId
    )
    const allSectionIds = [...existingIds, input.candidateSectionId]
    const meetings = await this.meetingsForSections(input.organizationId, allSectionIds)
    const bySection = new Map<string, UsisSectionMeeting[]>()
    for (const m of meetings) {
      const list = bySection.get(m.sectionId) ?? []
      list.push(m)
      bySection.set(m.sectionId, list)
    }

    const candidateMeetings = bySection.get(input.candidateSectionId) ?? []
    for (const existingId of existingIds) {
      const existingMeetings = bySection.get(existingId) ?? []
      for (const a of candidateMeetings) {
        for (const b of existingMeetings) {
          if (a.dayOfWeek !== b.dayOfWeek) continue
          if (!overlaps(a.startMinute, a.endMinute, b.startMinute, b.endMinute)) continue
          conflicts.push({
            kind: 'student',
            message: `Student schedule overlap on day ${a.dayOfWeek}`,
            sectionId: input.candidateSectionId,
            otherSectionId: existingId,
            dayOfWeek: a.dayOfWeek,
            startMinute: Math.max(a.startMinute, b.startMinute),
            endMinute: Math.min(a.endMinute, b.endMinute),
          })
        }
      }
    }

    const facultyAssignments = await FacultyClassAssignment.query()
      .where('organization_id', input.organizationId)
      .where('section_id', input.candidateSectionId)
      .where('is_active', true)
    for (const assignment of facultyAssignments) {
      const otherAssignments = await FacultyClassAssignment.query()
        .where('organization_id', input.organizationId)
        .where('faculty_user_id', assignment.facultyUserId)
        .where('is_active', true)
        .whereNot('section_id', input.candidateSectionId)
      const otherIds = otherAssignments.map((o) => o.sectionId)
      const otherMeetings = await this.meetingsForSections(input.organizationId, otherIds)
      for (const a of candidateMeetings) {
        for (const b of otherMeetings) {
          if (a.dayOfWeek !== b.dayOfWeek) continue
          if (!overlaps(a.startMinute, a.endMinute, b.startMinute, b.endMinute)) continue
          conflicts.push({
            kind: 'faculty',
            message: `Faculty schedule overlap on day ${a.dayOfWeek}`,
            sectionId: input.candidateSectionId,
            otherSectionId: b.sectionId,
            dayOfWeek: a.dayOfWeek,
            startMinute: Math.max(a.startMinute, b.startMinute),
            endMinute: Math.min(a.endMinute, b.endMinute),
          })
        }
      }
    }

    for (const a of candidateMeetings) {
      if (!a.roomCode) continue
      const roomPeers = await UsisSectionMeeting.query()
        .where('organization_id', input.organizationId)
        .where('room_code', a.roomCode)
        .whereNot('section_id', input.candidateSectionId)
      for (const b of roomPeers) {
        if (a.dayOfWeek !== b.dayOfWeek) continue
        if (!overlaps(a.startMinute, a.endMinute, b.startMinute, b.endMinute)) continue
        conflicts.push({
          kind: 'room',
          message: `Room ${a.roomCode} conflict on day ${a.dayOfWeek}`,
          sectionId: input.candidateSectionId,
          otherSectionId: b.sectionId,
          dayOfWeek: a.dayOfWeek,
          startMinute: Math.max(a.startMinute, b.startMinute),
          endMinute: Math.min(a.endMinute, b.endMinute),
        })
      }
    }

    return { ok: conflicts.length === 0, conflicts }
  }

  async resolveClassCodeLine(organizationId: string, line: string) {
    const requestedCodes = [...new Set(line.trim().split(/\s+/).filter(Boolean))]
    if (!requestedCodes.length) {
      return { requestedCodes: [] as string[], sections: [] as Array<Record<string, unknown>>, missingCodes: [] as string[] }
    }
    const rows = await Section.query()
      .where('organization_id', organizationId)
      .whereIn('code', requestedCodes)
    const byCode = new Map(rows.map((s) => [s.code, s]))
    const sections = []
    const missingCodes: string[] = []
    for (const code of requestedCodes) {
      const section = byCode.get(code)
      if (!section) {
        missingCodes.push(code)
        continue
      }
      const summary = await this.sectionSummary(organizationId, section.id)
      sections.push({
        code,
        sectionId: section.id,
        name: section.name,
        status: section.status,
        subjectId: section.subjectId,
        atCapacity: summary.atCapacity,
        seatsAvailable: summary.seatsAvailable,
      })
    }
    return { requestedCodes, sections, missingCodes }
  }

  async searchAlternateSections(input: {
    organizationId: string
    studentId: string
    subjectCode?: string | null
    conflictingSectionId?: string | null
    excludeSectionId?: string | null
    limit?: number
  }) {
    let subjectId: string | null = null
    if (input.conflictingSectionId) {
      const conflictSection = await Section.query()
        .where('organization_id', input.organizationId)
        .where('id', input.conflictingSectionId)
        .first()
      subjectId = conflictSection?.subjectId ?? null
    }
    if (!subjectId && input.subjectCode?.trim()) {
      const subject = await Subject.query()
        .where('organization_id', input.organizationId)
        .where('subject_code', input.subjectCode.trim())
        .first()
      subjectId = subject?.id ?? null
    }

    let query = Section.query()
      .where('organization_id', input.organizationId)
      .whereNot('status', 'dissolved')
      .orderBy('code', 'asc')

    if (subjectId) query = query.where('subject_id', subjectId)
    if (input.excludeSectionId) query = query.whereNot('id', input.excludeSectionId)

    const candidates = await query.limit(80)
    const open: Array<{
      sectionId: string
      sectionCode: string
      sectionName: string
      seatsAvailable: number | null
      waitlistEnabled: boolean
    }> = []

    for (const section of candidates) {
      if (input.conflictingSectionId && section.id === input.conflictingSectionId) continue
      const seated = await this.seatedCount(section.id)
      const capacity = section.capacity ?? 0
      if (capacity > 0 && seated >= capacity) continue
      const conflict = await this.detectConflicts({
        organizationId: input.organizationId,
        studentId: input.studentId,
        candidateSectionId: section.id,
        excludeSectionId: input.excludeSectionId ?? undefined,
      })
      if (!conflict.ok) continue
      open.push({
        sectionId: section.id,
        sectionCode: section.code,
        sectionName: section.name,
        seatsAvailable: capacity > 0 ? capacity - seated : null,
        waitlistEnabled: section.waitlistEnabled,
      })
      if (open.length >= (input.limit ?? 20)) break
    }

    return { subjectId, alternatives: open }
  }
}

export const schedulingService = new SchedulingService()
