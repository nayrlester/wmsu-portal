import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Section from '#modules/enrollment/models/section'
import Student from '#modules/enrollment/models/student'
import Subject from '#modules/enrollment/models/subject'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import UsisSectionWaitlistEntry from '#modules/enrollment/models/usis_section_waitlist_entry'
import { schedulingService } from '#modules/enrollment/services/scheduling_service'
import { schedulingNotificationService } from '#modules/enrollment/services/scheduling_notification_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'

export class WaitlistService {
  async join(input: {
    organizationId: string
    student: Student
    sectionId: string
    enrollmentId?: string | null
    actorUserId?: string | null
  }) {
    const section = await Section.query()
      .where('organization_id', input.organizationId)
      .where('id', input.sectionId)
      .firstOrFail()

    if (!section.waitlistEnabled) {
      throw new Error('Waitlist is not enabled for this section')
    }

    const seated = await schedulingService.seatedCount(section.id)
    const capacity = section.capacity ?? 0
    if (capacity <= 0 || seated < capacity) {
      throw new Error('Section still has available seats')
    }

    const existingSeat = await db
      .from(t('enrollment_lines'))
      .join(t('enrollments'), `${t('enrollments')}.id`, `${t('enrollment_lines')}.enrollment_id`)
      .where(`${t('enrollments')}.student_id`, input.student.id)
      .where(`${t('enrollment_lines')}.section_id`, section.id)
      .whereIn(`${t('enrollment_lines')}.status`, ['planned', 'registered', 'enrolled'])
      .first()
    if (existingSeat) {
      throw new Error('Already enrolled in this section')
    }

    const active = await UsisSectionWaitlistEntry.query()
      .where('section_id', section.id)
      .where('student_id', input.student.id)
      .where('status', 'waiting')
      .first()
    if (active) return active

    const maxRow = await UsisSectionWaitlistEntry.query()
      .where('section_id', section.id)
      .where('status', 'waiting')
      .orderBy('position', 'desc')
      .first()
    const position = (maxRow?.position ?? 0) + 1

    const row = await UsisSectionWaitlistEntry.create({
      organizationId: input.organizationId,
      sectionId: section.id,
      studentId: input.student.id,
      enrollmentId: input.enrollmentId ?? null,
      position,
      status: 'waiting',
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.CREATE,
      entityType: 'section_waitlist',
      entityId: row.id,
    })

    return row
  }

  listForStudent(organizationId: string, studentId: string) {
    return UsisSectionWaitlistEntry.query()
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .where('status', 'waiting')
      .preload('section')
      .orderBy('position', 'asc')
  }

  listForSection(organizationId: string, sectionId: string) {
    return UsisSectionWaitlistEntry.query()
      .where('organization_id', organizationId)
      .where('section_id', sectionId)
      .where('status', 'waiting')
      .preload('student')
      .orderBy('position', 'asc')
  }

  async leave(input: {
    organizationId: string
    studentId: string
    entryId: string
    actorUserId?: string | null
  }) {
    const row = await UsisSectionWaitlistEntry.query()
      .where('organization_id', input.organizationId)
      .where('id', input.entryId)
      .where('student_id', input.studentId)
      .where('status', 'waiting')
      .first()
    if (!row) throw new Error('Waitlist entry not found')
    row.status = 'cancelled'
    await row.save()
    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.UPDATE,
      entityType: 'section_waitlist',
      entityId: row.id,
    })
    return row
  }

  private async resolveEnrollmentId(
    trx: TransactionClientContract,
    organizationId: string,
    studentId: string,
    preferredEnrollmentId: string | null
  ) {
    if (preferredEnrollmentId) return preferredEnrollmentId
    const row = await db
      .from(t('enrollments'))
      .useTransaction(trx)
      .where('organization_id', organizationId)
      .where('student_id', studentId)
      .whereNotIn('status', ['cancelled', 'void', 'withdrawn'])
      .orderBy('created_at', 'desc')
      .first()
    return (row?.id as string | undefined) ?? null
  }

  async promoteNextIfSeatAvailable(input: {
    organizationId: string
    sectionId: string
    actorUserId?: string | null
    trx?: TransactionClientContract
  }) {
    const run = async (trx: TransactionClientContract) => {
      const section = await Section.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('id', input.sectionId)
        .forUpdate()
        .firstOrFail()

      if (section.status === 'dissolved') return null

      const seated = await schedulingService.seatedCount(section.id)
      const capacity = section.capacity ?? 0
      if (capacity <= 0 || seated >= capacity) return null
      if (!section.waitlistEnabled) return null

      const next = await UsisSectionWaitlistEntry.query({ client: trx })
        .where('section_id', section.id)
        .where('status', 'waiting')
        .orderBy('position', 'asc')
        .forUpdate()
        .first()
      if (!next) return null

      const enrollmentId = await this.resolveEnrollmentId(
        trx,
        input.organizationId,
        next.studentId,
        next.enrollmentId
      )
      if (!enrollmentId) {
        await schedulingNotificationService.notifyStudent({
          organizationId: input.organizationId,
          studentId: next.studentId,
          sectionId: section.id,
          eventType: 'waitlist_seat_available',
          title: 'Waitlist seat available',
          body: `A seat opened in section ${section.code}, but no active enrollment was found to seat you automatically. Contact the registrar to complete registration.`,
        })
        return null
      }

      const conflict = await schedulingService.detectConflicts({
        organizationId: input.organizationId,
        studentId: next.studentId,
        candidateSectionId: section.id,
      })
      if (!conflict.ok) {
        await schedulingNotificationService.notifyStudent({
          organizationId: input.organizationId,
          studentId: next.studentId,
          sectionId: section.id,
          eventType: 'waitlist_conflict_blocked',
          title: 'Waitlist promotion blocked',
          body: `A seat opened in section ${section.code}, but a schedule conflict prevented automatic seating: ${conflict.conflicts[0]?.message ?? 'conflict'}. Registrar may seat the next waiter or resolve the conflict.`,
        })
        return null
      }

      let subjectCode = 'TBD'
      let subjectTitle = 'TBD'
      let units = 3
      let subjectId: string | null = null
      if (section.subjectId) {
        const subject = await Subject.find(section.subjectId, { client: trx })
        if (subject) {
          subjectId = subject.id
          subjectCode = subject.subjectCode
          subjectTitle = subject.title
          units = subject.units
        }
      }

      await EnrollmentLine.create(
        {
          organizationId: input.organizationId,
          enrollmentId,
          subjectId,
          subjectCode,
          subjectTitle,
          units,
          sectionId: section.id,
          status: 'planned',
        },
        { client: trx }
      )

      next.useTransaction(trx)
      next.enrollmentId = enrollmentId
      next.status = 'promoted'
      await next.save()

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: AuditAction.UPDATE,
        entityType: 'section_waitlist',
        entityId: next.id,
      })

      await schedulingNotificationService.notifyStudent({
        organizationId: input.organizationId,
        studentId: next.studentId,
        sectionId: section.id,
        eventType: 'waitlist_promoted',
        title: 'Waitlist seat available',
        body: `You were promoted from the waitlist into section ${section.code}. Review your schedule and complete registration steps if required.`,
      })

      return next
    }

    if (input.trx) return run(input.trx)
    return db.transaction(run)
  }
}

export const waitlistService = new WaitlistService()
