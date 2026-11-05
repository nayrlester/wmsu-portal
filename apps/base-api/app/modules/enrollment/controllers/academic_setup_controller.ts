import type { HttpContext } from '@adonisjs/core/http'
import AcademicYear from '#modules/enrollment/models/academic_year'
import Program from '#modules/enrollment/models/program'
import Section from '#modules/enrollment/models/section'
import { createProgramValidator, createAcademicYearValidator, createSectionValidator } from '#modules/enrollment/validators/enrollment'

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
      ...payload,
    })

    return response.created({ data: section })
  }

  async updateSection(ctx: HttpContext) {
    const user = ctx.auth.user!
    const section = await Section.query()
      .where('organization_id', user.organizationId)
      .where('id', ctx.params.id)
      .firstOrFail()
    const waitlistEnabled = ctx.request.input('waitlistEnabled')
    const capacity = ctx.request.input('capacity')
    if (waitlistEnabled !== undefined && waitlistEnabled !== null) {
      section.waitlistEnabled = Boolean(waitlistEnabled)
    }
    if (capacity !== undefined && capacity !== null) {
      section.capacity = Number(capacity)
    }
    await section.save()
    return ctx.response.ok({ data: section })
  }
}
