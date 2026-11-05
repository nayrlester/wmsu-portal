import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
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
} from '#modules/enrollment/validators/enrollment'

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

    const query = Section.query().where('organization_id', user.organizationId).orderBy('year_level', 'asc')

    if (academicYearId) query.where('academic_year_id', academicYearId)

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
      status: 'open',
      enrolledCount: 0,
      waitlistEnabled: false,
    })

    return response.created({ data: section })
  }

  async updateSection(ctx: HttpContext) {
    const user = ctx.auth.user!
    const section = await Section.query()
      .where('organization_id', user.organizationId)
      .where('id', ctx.params.id)
      .firstOrFail()
    const body = ctx.request.all()
    const waitlistEnabled = body.waitlistEnabled
    const capacity = body.capacity
    const isBlockSection = body.isBlockSection
    const blockGroupCode = body.blockGroupCode
    const subjectId = body.subjectId
    if (typeof body.code === 'string' && body.code.trim()) section.code = body.code.trim()
    if (typeof body.name === 'string' && body.name.trim()) section.name = body.name.trim()
    if (body.yearLevel !== undefined && body.yearLevel !== null && body.yearLevel !== '') {
      section.yearLevel = Number(body.yearLevel)
    }
    if (body.semester !== undefined && body.semester !== null && body.semester !== '') {
      section.semester = Number(body.semester)
    }
    if (waitlistEnabled !== undefined && waitlistEnabled !== null) {
      section.waitlistEnabled = Boolean(waitlistEnabled)
    }
    if (capacity !== undefined && capacity !== null) {
      section.capacity = Number(capacity)
    }
    if (isBlockSection !== undefined && isBlockSection !== null) {
      section.isBlockSection = Boolean(isBlockSection)
    }
    if (blockGroupCode !== undefined) {
      section.blockGroupCode =
        blockGroupCode === null || blockGroupCode === ''
          ? null
          : String(blockGroupCode).trim().toUpperCase()
    }
    if (subjectId !== undefined) {
      section.subjectId = subjectId ? String(subjectId) : null
    }
    await section.save()
    return ctx.response.ok({ data: section })
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
