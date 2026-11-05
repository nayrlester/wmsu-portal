import db from '@adonisjs/lucid/services/db'
import Enrollment from '#modules/enrollment/models/enrollment'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import Subject from '#modules/enrollment/models/subject'
import Section from '#modules/enrollment/models/section'
import { schedulingService } from '#modules/enrollment/services/scheduling_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export class EnrollmentClassScheduleService {
  async applyClassCodeLine(input: {
    organizationId: string
    enrollmentId: string
    classCodesLine: string
    actorUserId: string
  }) {
    return db.transaction(async (trx) => {
      const enrollment = await Enrollment.query({ client: trx })
        .where('id', input.enrollmentId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()

      const resolved = await schedulingService.resolveClassCodeLine(input.organizationId, input.classCodesLine)
      if (resolved.missingCodes.length) {
        throw new Error(`Unknown section codes: ${resolved.missingCodes.join(', ')}`)
      }
      if (!resolved.sections.length) {
        throw new Error('Enter at least one section code separated by spaces')
      }

      const created: EnrollmentLine[] = []
      for (const row of resolved.sections) {
        const section = await Section.findOrFail(row.sectionId as string, { client: trx })
        if (section.status === 'dissolved') {
          throw new Error(`Section ${section.code} is dissolved`)
        }
        if (row.atCapacity) {
          throw new Error(`Section ${section.code} is at capacity`)
        }

        const conflict = await schedulingService.detectConflicts({
          organizationId: input.organizationId,
          studentId: enrollment.studentId,
          candidateSectionId: section.id,
        })
        if (!conflict.ok) {
          throw new Error(
            conflict.conflicts[0]?.message ?? `Schedule conflict for section ${section.code}`
          )
        }

        const duplicate = await EnrollmentLine.query({ client: trx })
          .where('enrollment_id', enrollment.id)
          .where('section_id', section.id)
          .whereIn('status', ['planned', 'registered', 'enrolled'])
          .first()
        if (duplicate) continue

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

        const line = await EnrollmentLine.create(
          {
            organizationId: input.organizationId,
            enrollmentId: enrollment.id,
            subjectId,
            subjectCode,
            subjectTitle,
            units,
            sectionId: section.id,
            status: 'planned',
          },
          { client: trx }
        )
        created.push(line)
      }

      if (!created.length) {
        throw new Error('No new sections added — you may already be enrolled in each code')
      }

      enrollment.useTransaction(trx)
      enrollment.requiresReadvising = true
      enrollment.requiresReassessment = true
      enrollment.paymentVerified = false
      await enrollment.save()

      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: AuditAction.CREATE,
        entityType: 'enrollment_line',
        entityId: created[0].id,
      })

      return { enrollment, createdLines: created, resolvedCodes: resolved.requestedCodes }
    })
  }
}

export const enrollmentClassScheduleService = new EnrollmentClassScheduleService()
