import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Enrollment from '#modules/enrollment/models/enrollment'
import EnrollmentLine from '#modules/enrollment/models/enrollment_line'
import Subject from '#modules/enrollment/models/subject'
import Section from '#modules/enrollment/models/section'
import Assessment from '#modules/enrollment/models/assessment'
import { schedulingService } from '#modules/enrollment/services/scheduling_service'
import { AssessmentService } from '#modules/enrollment/services/assessment_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export type AutoReassessResult = 'completed' | 'pending_readvising' | 'skipped' | 'failed'

export class EnrollmentClassScheduleService {
  async applyClassCodeLine(input: {
    organizationId: string
    enrollmentId: string
    classCodesLine: string
    actorUserId: string
    mode?: 'irregular' | 'block'
  }) {
    const mode = input.mode ?? 'irregular'
    const applied = await db.transaction(async (trx) => {
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

      const created = await this.addResolvedSections({
        trx,
        organizationId: input.organizationId,
        enrollment,
        sections: resolved.sections,
      })
      if (!created.length) {
        throw new Error('No new sections added — you may already be enrolled in each code')
      }

      enrollment.useTransaction(trx)
      if (mode === 'block') {
        enrollment.isRegularBlock = true
        enrollment.requiresReassessment = true
        if (!enrollment.advisingWaived) {
          enrollment.requiresReadvising = true
        }
      } else {
        enrollment.requiresReadvising = true
        enrollment.requiresReassessment = true
      }
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

    const autoReassessment = await this.tryAutoReassess(
      input.organizationId,
      input.enrollmentId,
      input.actorUserId
    )
    const enrollment =
      (await Enrollment.find(input.enrollmentId)) ?? applied.enrollment
    return { ...applied, enrollment, autoReassessment }
  }

  async encodeBlockGroup(input: {
    organizationId: string
    enrollmentId: string
    blockGroupCode: string
    actorUserId: string
  }) {
    const code = input.blockGroupCode.trim().toUpperCase()
    if (!code) throw new Error('blockGroupCode is required')

    const applied = await db.transaction(async (trx) => {
      const enrollment = await Enrollment.query({ client: trx })
        .where('id', input.enrollmentId)
        .where('organization_id', input.organizationId)
        .forUpdate()
        .firstOrFail()

      const blockSections = await Section.query({ client: trx })
        .where('organization_id', input.organizationId)
        .where('academic_year_id', enrollment.academicYearId)
        .whereRaw('UPPER(block_group_code) = ?', [code])
        .whereNot('status', 'dissolved')
        .whereNotNull('subject_id')
        .orderBy('code', 'asc')

      if (!blockSections.length) {
        throw new Error(`No active subject sections found for block group ${code}`)
      }

      const created = await this.addResolvedSections({
        trx,
        organizationId: input.organizationId,
        enrollment,
        sections: blockSections.map((s) => ({
          sectionId: s.id,
          code: s.code,
          name: s.name,
          atCapacity: false,
          seatsAvailable: null,
        })),
      })

      if (created.length) {
        const anchor = blockSections.find((s) => s.isBlockSection) ?? blockSections[0]
        enrollment.useTransaction(trx)
        enrollment.isRegularBlock = true
        enrollment.sectionId = anchor?.id ?? enrollment.sectionId
        enrollment.requiresReassessment = true
        if (!enrollment.advisingWaived) {
          enrollment.requiresReadvising = true
        }
        enrollment.paymentVerified = false
        await enrollment.save()

        await auditLogService.log({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: AuditAction.CREATE,
          entityType: 'enrollment_block_encode',
          entityId: enrollment.id,
        })
      }

      return {
        enrollment,
        createdLines: created,
        blockGroupCode: code,
        sectionCodes: blockSections.map((s) => s.code),
      }
    })

    const autoReassessment = await this.tryAutoReassess(
      input.organizationId,
      input.enrollmentId,
      input.actorUserId
    )
    const enrollment =
      (await Enrollment.find(input.enrollmentId)) ?? applied.enrollment
    return { ...applied, enrollment, autoReassessment }
  }

  async markScheduleChangeForReassessment(enrollmentId: string, organizationId: string) {
    const enrollment = await Enrollment.query()
      .where('id', enrollmentId)
      .where('organization_id', organizationId)
      .first()
    if (!enrollment) return
    enrollment.requiresReassessment = true
    enrollment.paymentVerified = false
    await enrollment.save()
  }

  async tryAutoReassess(
    organizationId: string,
    enrollmentId: string,
    actorUserId: string
  ): Promise<AutoReassessResult> {
    const enrollment = await Enrollment.query()
      .where('id', enrollmentId)
      .where('organization_id', organizationId)
      .first()
    if (!enrollment) return 'skipped'
    if (enrollment.requiresReadvising && !enrollment.advisingWaived) {
      return 'pending_readvising'
    }
    if (!enrollment.requiresReassessment) return 'skipped'

    const existing = await Assessment.query().where('enrollment_id', enrollmentId).first()
    if (!existing && !['advised', 'assessed', 'incomplete'].includes(enrollment.status)) {
      return 'skipped'
    }
    if (['payment_verified', 'registered'].includes(enrollment.status)) {
      return 'skipped'
    }

    try {
      if (enrollment.advisingWaived) {
        enrollment.requiresReadvising = false
        await enrollment.save()
      }
      const service = new AssessmentService()
      await service.prepareAssessment({
        organizationId,
        enrollmentId,
        actorUserId,
      })
      return 'completed'
    } catch {
      return 'failed'
    }
  }

  private async addResolvedSections(input: {
    trx: TransactionClientContract
    organizationId: string
    enrollment: Enrollment
    sections: Array<{
      sectionId: string
      code?: string
      name?: string
      atCapacity?: boolean
      seatsAvailable?: number | null
    }>
  }) {
    const created: EnrollmentLine[] = []
    for (const row of input.sections) {
      const section = await Section.findOrFail(row.sectionId, { client: input.trx })
      if (section.status === 'dissolved') {
        throw new Error(`Section ${section.code} is dissolved`)
      }
      if (row.atCapacity) {
        throw new Error(`Section ${section.code} is at capacity`)
      }

      const duplicate = await EnrollmentLine.query({ client: input.trx })
        .where('enrollment_id', input.enrollment.id)
        .where('section_id', section.id)
        .whereIn('status', ['planned', 'registered', 'enrolled'])
        .first()
      if (duplicate) continue

      const seated = await schedulingService.seatedCount(section.id)
      const capacity = section.capacity ?? 0
      if (capacity > 0 && seated >= capacity) {
        throw new Error(`Section ${section.code} is at capacity`)
      }

      const conflict = await schedulingService.detectConflicts({
        organizationId: input.organizationId,
        studentId: input.enrollment.studentId,
        candidateSectionId: section.id,
      })
      if (!conflict.ok) {
        throw new Error(
          conflict.conflicts[0]?.message ?? `Schedule conflict for section ${section.code}`
        )
      }

      let subjectCode = 'TBD'
      let subjectTitle = 'TBD'
      let units = 3
      let subjectId: string | null = null
      if (section.subjectId) {
        const subject = await Subject.find(section.subjectId, { client: input.trx })
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
          enrollmentId: input.enrollment.id,
          subjectId,
          subjectCode,
          subjectTitle,
          units,
          sectionId: section.id,
          status: 'planned',
        },
        { client: input.trx }
      )
      created.push(line)
    }

    return created
  }
}

export const enrollmentClassScheduleService = new EnrollmentClassScheduleService()
