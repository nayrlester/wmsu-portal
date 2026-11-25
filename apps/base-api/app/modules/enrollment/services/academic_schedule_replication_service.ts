import Section from '#modules/enrollment/models/section'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export type ReplicationConflictHint = {
  kind: 'room' | 'faculty'
  sourceSectionCode: string
  message: string
  dayOfWeek: number
  startMinute: number
  endMinute: number
  roomCode?: string | null
  facultyUserId?: string | null
}

function meetingsOverlap(
  a: { dayOfWeek: number; startMinute: number; endMinute: number },
  b: { dayOfWeek: number; startMinute: number; endMinute: number }
) {
  return a.dayOfWeek === b.dayOfWeek && a.startMinute < b.endMinute && b.startMinute < a.endMinute
}

export class AcademicScheduleReplicationService {
  async replicate(input: {
    organizationId: string
    sourceAcademicYearId: string
    targetAcademicYearId: string
    semester: number
    actorUserId: string
    dryRun?: boolean
  }) {
    if (input.sourceAcademicYearId === input.targetAcademicYearId) {
      throw new Error('Source and target academic year must differ')
    }

    const sourceSections = await Section.query()
      .where('organization_id', input.organizationId)
      .where('academic_year_id', input.sourceAcademicYearId)
      .where('semester', input.semester)
      .orderBy('code', 'asc')

    const targetExisting = await Section.query()
      .where('organization_id', input.organizationId)
      .where('academic_year_id', input.targetAcademicYearId)
      .where('semester', input.semester)

    const existingByCode = new Map(targetExisting.map((s) => [s.code, s]))
    const wouldCreateSections = sourceSections.filter((s) => !existingByCode.has(s.code))
    const wouldSkipSections = sourceSections.filter((s) => existingByCode.has(s.code))
    const skippedCodes = wouldSkipSections.map((s) => s.code)

    const targetSectionIds = targetExisting.map((s) => s.id)
    const targetMeetings =
      targetSectionIds.length === 0
        ? []
        : await UsisSectionMeeting.query()
            .where('organization_id', input.organizationId)
            .whereIn('section_id', targetSectionIds)

    const conflictHints: ReplicationConflictHint[] = []
    for (const src of wouldCreateSections) {
      const sourceMeetings = await UsisSectionMeeting.query()
        .where('organization_id', input.organizationId)
        .where('section_id', src.id)
      for (const a of sourceMeetings) {
        for (const b of targetMeetings) {
          if (!meetingsOverlap(a, b)) continue
          if (a.roomCode && b.roomCode && a.roomCode === b.roomCode) {
            conflictHints.push({
              kind: 'room',
              sourceSectionCode: src.code,
              message: `Room ${a.roomCode} overlaps existing target meeting on day ${a.dayOfWeek}`,
              dayOfWeek: a.dayOfWeek,
              startMinute: Math.max(a.startMinute, b.startMinute),
              endMinute: Math.min(a.endMinute, b.endMinute),
              roomCode: a.roomCode,
            })
          }
          if (a.facultyUserId && b.facultyUserId && a.facultyUserId === b.facultyUserId) {
            conflictHints.push({
              kind: 'faculty',
              sourceSectionCode: src.code,
              message: `Faculty overlap with existing target meeting on day ${a.dayOfWeek}`,
              dayOfWeek: a.dayOfWeek,
              startMinute: Math.max(a.startMinute, b.startMinute),
              endMinute: Math.min(a.endMinute, b.endMinute),
              facultyUserId: a.facultyUserId,
            })
          }
        }
      }
    }

    if (input.dryRun) {
      return {
        dryRun: true as const,
        wouldCreate: wouldCreateSections.length,
        wouldSkip: wouldSkipSections.length,
        sourceCount: sourceSections.length,
        skippedCodes,
        conflictHints,
        created: 0,
        skipped: wouldSkipSections.length,
        meetingsCopied: 0,
      }
    }

    let created = 0
    let skipped = 0
    let meetingsCopied = 0

    for (const src of sourceSections) {
      if (existingByCode.has(src.code)) {
        skipped += 1
        continue
      }

      const target = await Section.create({
        organizationId: input.organizationId,
        academicYearId: input.targetAcademicYearId,
        programId: src.programId,
        code: src.code,
        name: src.name,
        yearLevel: src.yearLevel,
        semester: src.semester,
        capacity: src.capacity,
        subjectId: src.subjectId,
        isBlockSection: src.isBlockSection,
        blockGroupCode: src.blockGroupCode,
        status: 'draft',
        enrolledCount: 0,
        waitlistEnabled: src.waitlistEnabled,
      })
      created += 1

      const meetings = await UsisSectionMeeting.query()
        .where('organization_id', input.organizationId)
        .where('section_id', src.id)
      for (const meeting of meetings) {
        await UsisSectionMeeting.create({
          organizationId: input.organizationId,
          sectionId: target.id,
          dayOfWeek: meeting.dayOfWeek,
          startMinute: meeting.startMinute,
          endMinute: meeting.endMinute,
          roomCode: meeting.roomCode,
          facultyUserId: meeting.facultyUserId,
        })
        meetingsCopied += 1
      }
    }

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AuditAction.CREATE,
      entityType: 'schedule_replication',
      entityId: input.targetAcademicYearId,
      metadata: {
        sourceAcademicYearId: input.sourceAcademicYearId,
        semester: input.semester,
        created,
        skipped,
        meetingsCopied,
        skippedCodes,
        conflictHintCount: conflictHints.length,
      },
    })

    return {
      dryRun: false as const,
      wouldCreate: created,
      wouldSkip: skipped,
      sourceCount: sourceSections.length,
      skippedCodes,
      conflictHints,
      created,
      skipped,
      meetingsCopied,
    }
  }
}

export const academicScheduleReplicationService = new AcademicScheduleReplicationService()
