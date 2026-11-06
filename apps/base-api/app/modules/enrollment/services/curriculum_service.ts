import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/enrollment/helpers/db_schema'
import Program from '#modules/enrollment/models/program'
import Subject from '#modules/enrollment/models/subject'
import SubjectPrerequisite from '#modules/enrollment/models/subject_prerequisite'
import SubjectCorequisite from '#modules/enrollment/models/subject_corequisite'
import UsisCurriculum from '#modules/enrollment/models/usis_curriculum'
import UsisCurriculumVersion, {
  type CurriculumVersionStatus,
} from '#modules/enrollment/models/usis_curriculum_version'
import UsisCurriculumVersionSubject from '#modules/enrollment/models/usis_curriculum_version_subject'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

const VERSION_STATUSES: CurriculumVersionStatus[] = ['draft', 'active', 'archived']

function badRequest(message: string) {
  return new Exception(message, { status: 422, code: 'E_VALIDATION_FAILURE' })
}

export class CurriculumService {
  async listCurricula(organizationId: string, programId?: string) {
    const q = UsisCurriculum.query()
      .where('organization_id', organizationId)
      .preload('program')
      .preload('versions', (vq) => vq.orderBy('created_at', 'desc'))
      .orderBy('code', 'asc')
    if (programId) q.where('program_id', programId)
    return q
  }

  async createCurriculum(
    organizationId: string,
    data: { programId: string; code: string; name: string; versionLabel?: string },
    actorUserId: string
  ) {
    const program = await Program.query()
      .where('organization_id', organizationId)
      .where('id', data.programId)
      .firstOrFail()

    const curriculum = await UsisCurriculum.create({
      organizationId,
      programId: program.id,
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      isActive: true,
    })

    const version = await UsisCurriculumVersion.create({
      organizationId,
      curriculumId: curriculum.id,
      versionLabel: (data.versionLabel || '1.0').trim(),
      status: 'draft',
      effectiveFrom: null,
      notes: null,
      duplicatedFromVersionId: null,
      createdBy: actorUserId,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_curriculum',
      entityId: curriculum.id,
      metadata: { versionId: version.id },
    })

    return { curriculum, version }
  }

  async updateCurriculum(
    organizationId: string,
    curriculumId: string,
    data: { code?: string; name?: string; programId?: string; isActive?: boolean },
    actorUserId: string
  ) {
    const curriculum = await UsisCurriculum.query()
      .where('organization_id', organizationId)
      .where('id', curriculumId)
      .firstOrFail()
    if (data.programId) {
      const program = await Program.query()
        .where('organization_id', organizationId)
        .where('id', data.programId)
        .firstOrFail()
      curriculum.programId = program.id
    }
    if (data.code !== undefined) curriculum.code = data.code.trim().toUpperCase()
    if (data.name !== undefined) curriculum.name = data.name.trim()
    if (data.isActive !== undefined) curriculum.isActive = data.isActive
    await curriculum.save()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_curriculum',
      entityId: curriculum.id,
    })
    return curriculum
  }

  async deleteCurriculum(organizationId: string, curriculumId: string, actorUserId: string) {
    const curriculum = await UsisCurriculum.query()
      .where('organization_id', organizationId)
      .where('id', curriculumId)
      .preload('versions')
      .firstOrFail()
    if ((curriculum.versions ?? []).some((version) => version.status === 'active')) {
      throw inUse(`Curriculum ${curriculum.code} has an active version and cannot be deleted`)
    }
    const versionIds = (curriculum.versions ?? []).map((version) => version.id)
    if (versionIds.length) {
      const placed = await UsisCurriculumVersionSubject.query()
        .where('organization_id', organizationId)
        .whereIn('curriculum_version_id', versionIds)
        .first()
      if (placed) {
        throw inUse(`Curriculum ${curriculum.code} still lists subjects and cannot be deleted`)
      }
    }
    await curriculum.delete()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'usis_curriculum',
      entityId: curriculumId,
    })
  }

  async listVersions(organizationId: string, curriculumId: string) {
    await UsisCurriculum.query()
      .where('organization_id', organizationId)
      .where('id', curriculumId)
      .firstOrFail()

    return UsisCurriculumVersion.query()
      .where('organization_id', organizationId)
      .where('curriculum_id', curriculumId)
      .orderBy('created_at', 'desc')
  }

  async createVersion(
    organizationId: string,
    curriculumId: string,
    data: { versionLabel: string; notes?: string | null; effectiveFrom?: string | null },
    actorUserId: string
  ) {
    await UsisCurriculum.query()
      .where('organization_id', organizationId)
      .where('id', curriculumId)
      .firstOrFail()

    const version = await UsisCurriculumVersion.create({
      organizationId,
      curriculumId,
      versionLabel: data.versionLabel.trim(),
      status: 'draft',
      effectiveFrom: data.effectiveFrom ? DateTime.fromISO(data.effectiveFrom) : null,
      notes: data.notes?.trim() || null,
      duplicatedFromVersionId: null,
      createdBy: actorUserId,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_curriculum_version',
      entityId: version.id,
    })
    return version
  }

  async duplicateVersion(
    organizationId: string,
    versionId: string,
    data: { versionLabel: string; notes?: string | null },
    actorUserId: string
  ) {
    const source = await UsisCurriculumVersion.query()
      .where('organization_id', organizationId)
      .where('id', versionId)
      .firstOrFail()

    const exists = await UsisCurriculumVersion.query()
      .where('curriculum_id', source.curriculumId)
      .where('version_label', data.versionLabel.trim())
      .first()
    if (exists) throw badRequest('versionLabel already exists for this curriculum')

    const version = await UsisCurriculumVersion.create({
      organizationId,
      curriculumId: source.curriculumId,
      versionLabel: data.versionLabel.trim(),
      status: 'draft',
      effectiveFrom: null,
      notes: data.notes?.trim() || `Duplicated from ${source.versionLabel}`,
      duplicatedFromVersionId: source.id,
      createdBy: actorUserId,
    })

    const lines = await UsisCurriculumVersionSubject.query().where(
      'curriculum_version_id',
      source.id
    )
    for (const line of lines) {
      await UsisCurriculumVersionSubject.create({
        organizationId,
        curriculumVersionId: version.id,
        subjectId: line.subjectId,
        yearLevel: line.yearLevel,
        semester: line.semester,
        isRequired: line.isRequired,
        sortOrder: line.sortOrder,
      })
    }

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_curriculum_version',
      entityId: version.id,
      metadata: { duplicatedFromVersionId: source.id, subjectCount: lines.length },
    })
    return version
  }

  async activateVersion(organizationId: string, versionId: string, actorUserId: string) {
    const version = await UsisCurriculumVersion.query()
      .where('organization_id', organizationId)
      .where('id', versionId)
      .firstOrFail()

    const siblings = await UsisCurriculumVersion.query()
      .where('curriculum_id', version.curriculumId)
      .where('status', 'active')
    for (const row of siblings) {
      if (row.id === version.id) continue
      row.status = 'archived'
      await row.save()
    }

    version.status = 'active'
    if (!version.effectiveFrom) version.effectiveFrom = DateTime.now().startOf('day')
    await version.save()

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_curriculum_version',
      entityId: version.id,
      metadata: { status: 'active' },
    })
    return version
  }

  async updateVersionStatus(
    organizationId: string,
    versionId: string,
    status: CurriculumVersionStatus,
    actorUserId: string
  ) {
    if (!VERSION_STATUSES.includes(status)) throw badRequest('Invalid version status')
    if (status === 'active') return this.activateVersion(organizationId, versionId, actorUserId)

    const version = await UsisCurriculumVersion.query()
      .where('organization_id', organizationId)
      .where('id', versionId)
      .firstOrFail()
    version.status = status
    await version.save()

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'usis_curriculum_version',
      entityId: version.id,
      metadata: { status },
    })
    return version
  }

  async listVersionSubjects(organizationId: string, versionId: string) {
    await UsisCurriculumVersion.query()
      .where('organization_id', organizationId)
      .where('id', versionId)
      .firstOrFail()

    return UsisCurriculumVersionSubject.query()
      .where('organization_id', organizationId)
      .where('curriculum_version_id', versionId)
      .preload('subject')
      .orderBy('year_level', 'asc')
      .orderBy('semester', 'asc')
      .orderBy('sort_order', 'asc')
  }

  async addVersionSubject(
    organizationId: string,
    versionId: string,
    data: {
      subjectId: string
      yearLevel?: number
      semester?: number
      isRequired?: boolean
      sortOrder?: number
    },
    actorUserId: string
  ) {
    const version = await UsisCurriculumVersion.query()
      .where('organization_id', organizationId)
      .where('id', versionId)
      .firstOrFail()
    if (version.status === 'archived') throw badRequest('Cannot edit an archived curriculum version')

    await Subject.query()
      .where('organization_id', organizationId)
      .where('id', data.subjectId)
      .firstOrFail()

    const existing = await UsisCurriculumVersionSubject.query()
      .where('curriculum_version_id', versionId)
      .where('subject_id', data.subjectId)
      .first()
    if (existing) throw badRequest('Subject already on this curriculum version')

    const row = await UsisCurriculumVersionSubject.create({
      organizationId,
      curriculumVersionId: versionId,
      subjectId: data.subjectId,
      yearLevel: data.yearLevel ?? 1,
      semester: data.semester ?? 1,
      isRequired: data.isRequired ?? true,
      sortOrder: data.sortOrder ?? 0,
    })

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'usis_curriculum_version_subject',
      entityId: row.id,
    })
    return row
  }

  async removeVersionSubject(organizationId: string, versionId: string, lineId: string, actorUserId: string) {
    const version = await UsisCurriculumVersion.query()
      .where('organization_id', organizationId)
      .where('id', versionId)
      .firstOrFail()
    if (version.status === 'archived') throw badRequest('Cannot edit an archived curriculum version')

    const row = await UsisCurriculumVersionSubject.query()
      .where('organization_id', organizationId)
      .where('curriculum_version_id', versionId)
      .where('id', lineId)
      .firstOrFail()
    await row.delete()

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'usis_curriculum_version_subject',
      entityId: lineId,
    })
  }

  async updateSubjectCatalog(
    organizationId: string,
    subjectId: string,
    data: Partial<{
      subjectCode: string
      title: string
      units: number
      lectureHours: number | null
      laboratoryHours: number | null
      isActive: boolean
      programId: string | null
    }>,
    actorUserId: string
  ) {
    const subject = await Subject.query()
      .where('organization_id', organizationId)
      .where('id', subjectId)
      .firstOrFail()

    if (data.subjectCode !== undefined) subject.subjectCode = data.subjectCode.trim().toUpperCase()
    if (data.title !== undefined) subject.title = data.title.trim()
    if (data.units !== undefined) subject.units = data.units
    if (data.lectureHours !== undefined) subject.lectureHours = data.lectureHours
    if (data.laboratoryHours !== undefined) subject.laboratoryHours = data.laboratoryHours
    if (data.isActive !== undefined) subject.isActive = data.isActive
    if (data.programId !== undefined) {
      if (data.programId === null) {
        subject.programId = null
      } else {
        const program = await Program.query()
          .where('organization_id', organizationId)
          .where('id', data.programId)
          .firstOrFail()
        subject.programId = program.id
      }
    }
    await subject.save()

    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'subject',
      entityId: subject.id,
    })
    return subject
  }

  async deleteSubject(organizationId: string, subjectId: string, actorUserId: string) {
    const subject = await Subject.query()
      .where('organization_id', organizationId)
      .where('id', subjectId)
      .firstOrFail()
    await assertSubjectUnused(subject.id, subject.subjectCode)
    await SubjectPrerequisite.query()
      .where('organization_id', organizationId)
      .where((query) => {
        query.where('subject_id', subject.id).orWhere('requires_subject_id', subject.id)
      })
      .delete()
    await SubjectCorequisite.query()
      .where('organization_id', organizationId)
      .where((query) => {
        query.where('subject_id', subject.id).orWhere('corequisite_subject_id', subject.id)
      })
      .delete()
    await subject.delete()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'subject',
      entityId: subjectId,
    })
  }

  async listPrerequisites(organizationId: string, subjectId: string) {
    return SubjectPrerequisite.query()
      .where('organization_id', organizationId)
      .where('subject_id', subjectId)
      .preload('requiresSubject')
  }

  async addPrerequisite(
    organizationId: string,
    subjectId: string,
    requiresSubjectId: string,
    actorUserId: string
  ) {
    if (subjectId === requiresSubjectId) throw badRequest('Subject cannot require itself')
    await Subject.query().where('organization_id', organizationId).where('id', subjectId).firstOrFail()
    await Subject.query()
      .where('organization_id', organizationId)
      .where('id', requiresSubjectId)
      .firstOrFail()

    const existing = await SubjectPrerequisite.query()
      .where('subject_id', subjectId)
      .where('requires_subject_id', requiresSubjectId)
      .first()
    if (existing) return existing

    const row = await SubjectPrerequisite.create({
      organizationId,
      subjectId,
      requiresSubjectId,
    })
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'subject_prerequisite',
      entityId: row.id,
    })
    return row
  }

  async removePrerequisite(organizationId: string, subjectId: string, prerequisiteId: string, actorUserId: string) {
    const row = await SubjectPrerequisite.query()
      .where('organization_id', organizationId)
      .where('subject_id', subjectId)
      .where('id', prerequisiteId)
      .firstOrFail()
    await row.delete()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'subject_prerequisite',
      entityId: prerequisiteId,
    })
  }

  async listCorequisites(organizationId: string, subjectId: string) {
    return SubjectCorequisite.query()
      .where('organization_id', organizationId)
      .where('subject_id', subjectId)
      .preload('corequisiteSubject')
  }

  async addCorequisite(
    organizationId: string,
    subjectId: string,
    corequisiteSubjectId: string,
    actorUserId: string
  ) {
    if (subjectId === corequisiteSubjectId) throw badRequest('Subject cannot be its own corequisite')
    await Subject.query().where('organization_id', organizationId).where('id', subjectId).firstOrFail()
    await Subject.query()
      .where('organization_id', organizationId)
      .where('id', corequisiteSubjectId)
      .firstOrFail()

    const existing = await SubjectCorequisite.query()
      .where('subject_id', subjectId)
      .where('corequisite_subject_id', corequisiteSubjectId)
      .first()
    if (existing) return existing

    const row = await SubjectCorequisite.create({
      organizationId,
      subjectId,
      corequisiteSubjectId,
    })
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'subject_corequisite',
      entityId: row.id,
    })
    return row
  }

  async removeCorequisite(organizationId: string, subjectId: string, corequisiteId: string, actorUserId: string) {
    const row = await SubjectCorequisite.query()
      .where('organization_id', organizationId)
      .where('subject_id', subjectId)
      .where('id', corequisiteId)
      .firstOrFail()
    await row.delete()
    await auditLogService.log({
      organizationId,
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'subject_corequisite',
      entityId: corequisiteId,
    })
  }

  async getActiveVersionSubjectsForProgram(organizationId: string, programId: string) {
    const curriculum = await UsisCurriculum.query()
      .where('organization_id', organizationId)
      .where('program_id', programId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')
      .first()
    if (!curriculum) return null

    const version = await UsisCurriculumVersion.query()
      .where('curriculum_id', curriculum.id)
      .where('status', 'active')
      .orderBy('created_at', 'desc')
      .first()
    if (!version) return null

    return UsisCurriculumVersionSubject.query()
      .where('curriculum_version_id', version.id)
      .preload('subject')
  }

  async advisingCourseOptions(input: {
    organizationId: string
    studentProgramId: string | null
    yearLevel: number | null
    semester: number | null
    assessedSubjects: string[]
  }) {
    const studentProgram = input.studentProgramId
      ? await Program.query()
          .where('organization_id', input.organizationId)
          .where('id', input.studentProgramId)
          .first()
      : null
    const curricula = await UsisCurriculum.query()
      .where('organization_id', input.organizationId)
      .where('is_active', true)
      .preload('program')
      .preload('versions', (query) => {
        query.where('status', 'active').orderBy('created_at', 'desc')
      })
    const assessed = new Set(input.assessedSubjects)
    const studentCode = studentProgram?.code?.toUpperCase() ?? ''
    const studentName = studentProgram?.name?.trim().toLowerCase() ?? ''
    const options = []
    for (const curriculum of curricula) {
      const version = curriculum.versions?.[0]
      if (!version) continue
      const lines = await UsisCurriculumVersionSubject.query()
        .where('curriculum_version_id', version.id)
        .preload('subject')
      const remaining = lines
        .filter((line) => line.subject && !assessed.has(line.subject.subjectCode))
        .map((line) => ({
          id: line.subject!.id,
          subjectCode: line.subject!.subjectCode,
          title: line.subject!.title,
          units: Number(line.subject!.units),
          yearLevel: line.yearLevel,
          semester: line.semester,
        }))
      const forTerm = remaining.filter((subject) => {
        const yearOk = input.yearLevel == null || subject.yearLevel === input.yearLevel
        const semesterOk = input.semester == null || subject.semester === input.semester
        return yearOk && semesterOk
      })
      const subjects = forTerm.length
        ? forTerm
        : remaining.filter((subject) => input.yearLevel == null || subject.yearLevel === input.yearLevel)
      const programCode = curriculum.program?.code ?? curriculum.code
      const programName = curriculum.program?.name ?? curriculum.name
      const normalizedCode = programCode.toUpperCase()
      const matchesStudent = Boolean(
        (input.studentProgramId && curriculum.programId === input.studentProgramId) ||
          (studentName && programName.trim().toLowerCase() === studentName) ||
          (studentCode &&
            normalizedCode &&
            (studentCode === normalizedCode ||
              studentCode.startsWith(`${normalizedCode}-`) ||
              normalizedCode.startsWith(`${studentCode}-`)))
      )
      options.push({
        id: curriculum.id,
        code: programCode,
        name: programName,
        curriculumCode: curriculum.code,
        matchesStudent,
        subjects,
      })
    }
    return options.sort(
      (a, b) => Number(b.matchesStudent) - Number(a.matchesStudent) || a.code.localeCompare(b.code)
    )
  }
}

async function countColumn(table: string, column: string, id: string) {
  const row = await db.from(t(table)).where(column, id).count('* as total').first()
  return Number(row?.total ?? 0)
}

async function assertSubjectUnused(subjectId: string, code: string) {
  const refs: Array<[string, string]> = [
    ['sections', 'subject_id'],
    ['enrollment_lines', 'subject_id'],
    ['class_records', 'subject_id'],
    ['student_subject_credits', 'subject_id'],
    ['usis_curriculum_version_subjects', 'subject_id'],
    ['advising_recommendations', 'subject_id'],
    ['enrollment_change_requests', 'subject_id'],
  ]
  for (const [table, column] of refs) {
    if ((await countColumn(table, column, subjectId)) > 0) {
      throw inUse(`Subject ${code} is in use and cannot be deleted`)
    }
  }
}

function inUse(message: string) {
  return new Exception(message, { status: 409, code: 'E_IN_USE' })
}

export const curriculumService = new CurriculumService()
