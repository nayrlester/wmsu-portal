import Section from '#modules/enrollment/models/section'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export class AcademicScheduleReplicationService {
  async replicate(input: {
    organizationId: string
    sourceAcademicYearId: string
    targetAcademicYearId: string
    semester: number
    actorUserId: string
  }) {
    if (input.sourceAcademicYearId === input.targetAcademicYearId) {
      throw new Error('Source and target academic year must differ')
    }

    const sourceSections = await Section.query()
      .where('organization_id', input.organizationId)
      .where('academic_year_id', input.sourceAcademicYearId)
      .where('semester', input.semester)
      .orderBy('code', 'asc')

    let created = 0
    let skipped = 0
    let meetingsCopied = 0

    for (const src of sourceSections) {
      const exists = await Section.query()
        .where('organization_id', input.organizationId)
        .where('academic_year_id', input.targetAcademicYearId)
        .where('semester', input.semester)
        .where('code', src.code)
        .first()
      if (exists) {
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
      },
    })

    return { created, skipped, meetingsCopied, sourceCount: sourceSections.length }
  }
}

export const academicScheduleReplicationService = new AcademicScheduleReplicationService()
