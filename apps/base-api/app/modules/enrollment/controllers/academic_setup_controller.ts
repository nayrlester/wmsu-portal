import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import AcademicYear from '#modules/enrollment/models/academic_year'
import Program from '#modules/enrollment/models/program'
import Section from '#modules/enrollment/models/section'
import { t } from '#modules/enrollment/helpers/db_schema'
import {
  createProgramValidator,
  createAcademicYearValidator,
  createSectionValidator,
  updateAcademicYearValidator,
  updateProgramValidator,
  updateSectionValidator,
  replicateSchedulesValidator,
} from '#modules/enrollment/validators/enrollment'
import { academicScheduleReplicationService } from '#modules/enrollment/services/academic_schedule_replication_service'

export default class AcademicSetupController {
  async listAcademicYears({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    const years = await AcademicYear.query()
      .where('organization_id', user.organizationId)
      .orderBy('start_date', 'desc')
      .paginate(page, limit)

    return response.ok({ data: years })
  }

  async createAcademicYear({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createAcademicYearValidator)

    const year = await AcademicYear.create({
      organizationId: user.organizationId,
      ...payload,
      isActive: false,
    })

    return response.created({ data: year })
  }

  async updateAcademicYear({ request, response, auth, params }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(updateAcademicYearValidator)
    const year = await AcademicYear.query()
      .where('organization_id', user.organizationId)
      .where('id', params.id)
      .firstOrFail()

    if (payload.code !== undefined) year.code = payload.code.trim()
    if (payload.name !== undefined) year.name = payload.name.trim()
    if (payload.startDate !== undefined) year.startDate = DateTime.fromISO(payload.startDate)
    if (payload.endDate !== undefined) year.endDate = DateTime.fromISO(payload.endDate)
    if (payload.isActive !== undefined) year.isActive = payload.isActive

    if (year.isActive) {
      await AcademicYear.query()
        .where('organization_id', user.organizationId)
        .whereNot('id', year.id)
        .update({ is_active: false })
    }

    await year.save()
    return response.ok({ data: year })
  }

  async deleteAcademicYear({ response, auth, params }: HttpContext) {
    const user = auth.user!
    const year = await AcademicYear.query()
      .where('organization_id', user.organizationId)
      .where('id', params.id)
      .firstOrFail()
    await assertUnused(
      [
        ['sections', 'academic_year_id'],
        ['enrollments', 'academic_year_id'],
        ['class_records', 'academic_year_id'],
        ['faculty_class_assignments', 'academic_year_id'],
      ],
      year.id,
      `Academic year ${year.code} is in use and cannot be deleted`
    )
    await year.delete()
    return response.ok({ data: { id: year.id, deleted: true } })
  }

  async listPrograms({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    const programs = await Program.query()
      .where('organization_id', user.organizationId)
      .orderBy('name', 'asc')
      .paginate(page, limit)

    return response.ok({ data: programs })
  }

  async createProgram({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createProgramValidator)

    const program = await Program.create({
      organizationId: user.organizationId,
      ...payload,
      isActive: true,
    })

    return response.created({ data: program })
  }

  async updateProgram({ request, response, auth, params }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(updateProgramValidator)
    const program = await Program.query()
      .where('organization_id', user.organizationId)
      .where('id', params.id)
      .firstOrFail()

    if (payload.code !== undefined) program.code = payload.code.trim()
    if (payload.name !== undefined) program.name = payload.name.trim()
    if (payload.degreeLevel !== undefined) program.degreeLevel = payload.degreeLevel
    if (payload.years !== undefined) program.years = payload.years
    if (payload.isActive !== undefined) program.isActive = payload.isActive

    await program.save()
    return response.ok({ data: program })
  }

  async deleteProgram({ response, auth, params }: HttpContext) {
    const user = auth.user!
    const program = await Program.query()
      .where('organization_id', user.organizationId)
      .where('id', params.id)
      .firstOrFail()
    await assertUnused(
      [
        ['students', 'program_id'],
        ['sections', 'program_id'],
        ['applicants', 'program_id'],
      ],
      program.id,
      `Program ${program.code} is in use and cannot be deleted`
    )
    await program.delete()
    return response.ok({ data: { id: program.id, deleted: true } })
  }

  async listSections({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const academicYearId = request.input('academicYearId')
    const search = String(request.input('search', '')).trim()

    const query = Section.query().where('organization_id', user.organizationId).orderBy('year_level', 'asc')

    if (academicYearId) query.where('academic_year_id', academicYearId)
    if (search) {
      const pattern = `%${search}%`
      query.where((group) => {
        group.whereILike('code', pattern).orWhereILike('name', pattern)
      })
    }

    const sections = await query.paginate(page, limit)
    return response.ok({ data: sections })
  }

  async createSection({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createSectionValidator)

    const section = await Section.create({
      organizationId: user.organizationId,
      academicYearId: payload.academicYearId,
      programId: payload.programId,
      code: payload.code,
      name: payload.name,
      yearLevel: payload.yearLevel,
      semester: payload.semester,
      capacity: payload.capacity ?? null,
      subjectId: payload.subjectId ?? null,
      isBlockSection: payload.isBlockSection ?? false,
      blockGroupCode: payload.blockGroupCode?.trim().toUpperCase() || null,
      status: 'active',
      enrolledCount: 0,
      waitlistEnabled: false,
    })

    return response.created({ data: section })
  }

  async updateSection(ctx: HttpContext) {
    const user = ctx.auth.user!
    const payload = await ctx.request.validateUsing(updateSectionValidator)
    const section = await Section.query()
      .where('organization_id', user.organizationId)
      .where('id', ctx.params.id)
      .firstOrFail()
    if (payload.code !== undefined) section.code = payload.code.trim()
    if (payload.name !== undefined) section.name = payload.name.trim()
    if (payload.yearLevel !== undefined) section.yearLevel = payload.yearLevel
    if (payload.semester !== undefined) section.semester = payload.semester
    if (payload.waitlistEnabled !== undefined) section.waitlistEnabled = payload.waitlistEnabled
    if (payload.capacity !== undefined) section.capacity = payload.capacity
    if (payload.isBlockSection !== undefined) section.isBlockSection = payload.isBlockSection
    if (payload.blockGroupCode !== undefined) {
      section.blockGroupCode = payload.blockGroupCode?.trim().toUpperCase() || null
    }
    if (payload.subjectId !== undefined) section.subjectId = payload.subjectId
    if (payload.status !== undefined) {
      if (payload.status === 'dissolved' && section.status !== 'dissolved') {
        throw new Exception('Use scheduling dissolve to mark a section dissolved', {
          status: 422,
          code: 'E_SECTION_STATUS',
        })
      }
      section.status = payload.status
    }
    await section.save()
    return ctx.response.ok({ data: section })
  }

  async replicateSchedules(ctx: HttpContext) {
    const user = ctx.auth.user!
    const payload = await ctx.request.validateUsing(replicateSchedulesValidator)
    try {
      const data = await academicScheduleReplicationService.replicate({
        organizationId: user.organizationId,
        sourceAcademicYearId: payload.sourceAcademicYearId,
        targetAcademicYearId: payload.targetAcademicYearId,
        semester: payload.semester,
        actorUserId: user.id,
      })
      return ctx.response.created({ data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Replication failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async bulkUpdateSectionStatus(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          sectionIds: vine.array(vine.string().uuid()).minLength(1),
          status: vine.enum(['draft', 'open', 'active', 'closed'] as const),
        })
      )
    )
    const rows = await Section.query()
      .where('organization_id', user.organizationId)
      .whereIn('id', body.sectionIds)
    for (const section of rows) {
      section.status = body.status
      await section.save()
    }
    return ctx.response.ok({ data: { updated: rows.length, status: body.status } })
  }

  async deleteSection(ctx: HttpContext) {
    const user = ctx.auth.user!
    const section = await Section.query()
      .where('organization_id', user.organizationId)
      .where('id', ctx.params.id)
      .firstOrFail()
    await assertUnused(
      [
        ['enrollments', 'section_id'],
        ['enrollment_lines', 'section_id'],
        ['usis_section_meetings', 'section_id'],
        ['faculty_class_assignments', 'section_id'],
      ],
      section.id,
      `Section ${section.code} is in use and cannot be deleted`
    )
    await section.delete()
    return ctx.response.ok({ data: { id: section.id, deleted: true } })
  }
}

async function assertUnused(
  refs: Array<[table: string, column: string]>,
  id: string,
  message: string
) {
  for (const [table, column] of refs) {
    const row = await db.from(t(table)).where(column, id).count('* as total').first()
    const total = Number(row?.total ?? 0)
    if (total > 0) {
      throw new Exception(message, { status: 409, code: 'E_IN_USE' })
    }
  }
}
