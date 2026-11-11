import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Student from '#modules/enrollment/models/student'
import { STUDENT_CLASSIFICATIONS } from '#modules/enrollment/domain/enrollment_workflow'
import { studentMergeService } from '#modules/enrollment/services/student_merge_service'
import { studentProfileService } from '#modules/enrollment/services/student_profile_service'
import { StudentAccountService } from '#modules/enrollment/services/student_account_service'
import { rbacService } from '#modules/enrollment/services/rbac_service'

const violationValidator = vine.compile(
  vine.object({
    violationCode: vine.string().trim().minLength(1).maxLength(64),
    title: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    status: vine.enum(['recorded', 'cleared', 'appealed'] as const).optional(),
    occurredAt: vine.string().optional(),
  })
)

const violationUpdateValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(255).optional(),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    status: vine.enum(['recorded', 'cleared', 'appealed'] as const).optional(),
  })
)

async function resolveLinkedStudent(organizationId: string, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null
  return Student.query()
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .whereRaw('LOWER(email) = ?', [normalized])
    .first()
}

async function assertCanAccessStudentProfile(ctx: HttpContext, studentId: string) {
  const user = ctx.auth.user!
  const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions ?? [])
  const canOthers =
    permissions.includes('*') ||
    permissions.includes('students.read') ||
    permissions.includes('enrollments.read')
  if (!canOthers) {
    const self = await resolveLinkedStudent(user.organizationId, user.email)
    if (!self || self.id !== studentId) {
      throw Object.assign(new Error('Forbidden'), { status: 403 })
    }
  }
}

const updateStudentValidator = vine.compile(
  vine.object({
    classification: vine
      .enum([...STUDENT_CLASSIFICATIONS] as [string, ...string[]])
      .nullable()
      .optional(),
    mdmCampusId: vine.string().uuid().nullable().optional(),
    yearLevel: vine.number().min(1).max(12).nullable().optional(),
    status: vine.enum(['active', 'inactive', 'graduated', 'withdrawn']).optional(),
  })
)

const mergeStudentsValidator = vine.compile(
  vine.object({
    survivorStudentId: vine.string().uuid(),
    duplicateStudentId: vine.string().uuid(),
    note: vine.string().trim().maxLength(500).optional(),
  })
)

function serializeStudent(student: Student) {
  return {
    id: student.id,
    organizationId: student.organizationId,
    studentNumber: student.studentNumber,
    applicantId: student.applicantId,
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    email: student.email,
    mobile: student.mobile,
    birthDate: student.birthDate?.toISODate?.() ?? student.birthDate,
    programId: student.programId,
    status: student.status,
    classification: student.classification,
    mdmCampusId: student.mdmCampusId,
    yearLevel: student.yearLevel,
    platformUserId: student.platformUserId,
    mergedIntoStudentId: student.mergedIntoStudentId,
    deletedAt: student.deletedAt?.toISO?.() ?? null,
    createdAt: student.createdAt?.toISO?.() ?? null,
    updatedAt: student.updatedAt?.toISO?.() ?? null,
  }
}

export default class StudentsController {
  async me({ response, auth }: HttpContext) {
    const user = auth.user!
    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return response.notFound({ message: 'No student profile linked to this account' })
    }

    const student = await Student.query()
      .where('organization_id', user.organizationId)
      .whereNull('deleted_at')
      .whereRaw('LOWER(email) = ?', [email])
      .first()

    if (!student) {
      return response.notFound({ message: 'No student profile linked to this account' })
    }

    return response.ok({ data: serializeStudent(student) })
  }

  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const status = request.input('status')
    const search = request.input('search')
    const includeMerged = request.input('includeMerged') === 'true' || request.input('includeMerged') === true

    const query = Student.query().where('organization_id', user.organizationId).orderBy('created_at', 'desc')
    if (!includeMerged) query.whereNull('deleted_at')

    if (status) query.where('status', status)
    if (search) {
      query.where((q) => {
        q.where('student_number', 'ILIKE', `%${search}%`)
          .orWhere('first_name', 'ILIKE', `%${search}%`)
          .orWhere('last_name', 'ILIKE', `%${search}%`)
          .orWhere('email', 'ILIKE', `%${search}%`)
      })
    }

    const students = await query.paginate(page, limit)
    return response.ok({
      data: {
        data: students.all().map(serializeStudent),
        meta: {
          total: students.total,
          perPage: students.perPage,
          currentPage: students.currentPage,
          lastPage: students.lastPage,
        },
      },
    })
  }

  async show({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const student = await Student.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .whereNull('deleted_at')
      .preload('program')
      .firstOrFail()

    return response.ok({ data: serializeStudent(student) })
  }

  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(updateStudentValidator)
    const student = await studentMergeService.updateStudentProfile(
      user.organizationId,
      params.id,
      payload,
      user.id
    )
    return response.ok({ data: serializeStudent(student) })
  }

  async classifications({ response }: HttpContext) {
    return response.ok({ data: studentMergeService.listClassifications() })
  }

  async mergeJobs({ response, auth }: HttpContext) {
    const rows = await studentMergeService.listMergeJobs(auth.user!.organizationId)
    return response.ok({
      data: rows.map((row) => ({
        id: row.id,
        survivorStudentId: row.survivorStudentId,
        duplicateStudentId: row.duplicateStudentId,
        status: row.status,
        reportJson: row.reportJson,
        note: row.note,
        createdAt: row.createdAt.toISO(),
        completedAt: row.completedAt?.toISO() ?? null,
      })),
    })
  }

  async merge({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(mergeStudentsValidator)
    const result = await studentMergeService.mergeStudents(user.organizationId, payload, user.id)
    return response.ok({
      data: {
        job: {
          id: result.job.id,
          survivorStudentId: result.job.survivorStudentId,
          duplicateStudentId: result.job.duplicateStudentId,
          status: result.job.status,
          reportJson: result.job.reportJson,
          note: result.job.note,
          createdAt: result.job.createdAt.toISO(),
          completedAt: result.job.completedAt?.toISO() ?? null,
        },
        survivor: serializeStudent(result.survivor),
        duplicate: serializeStudent(result.duplicate),
      },
    })
  }

  async myProfile(ctx: HttpContext) {
    const user = ctx.auth.user!
    const student = await resolveLinkedStudent(user.organizationId, user.email)
    if (!student) {
      return ctx.response.notFound({ message: 'No student profile linked to this account' })
    }
    const data = await studentProfileService.getProfile(user.organizationId, student.id)
    return ctx.response.ok({ data })
  }

  async profile(ctx: HttpContext) {
    try {
      await assertCanAccessStudentProfile(ctx, ctx.params.id)
    } catch {
      return ctx.response.forbidden({ message: 'Forbidden' })
    }
    const data = await studentProfileService.getProfile(ctx.auth.user!.organizationId, ctx.params.id)
    return ctx.response.ok({ data })
  }

  async absences(ctx: HttpContext) {
    try {
      await assertCanAccessStudentProfile(ctx, ctx.params.id)
    } catch {
      return ctx.response.forbidden({ message: 'Forbidden' })
    }
    const data = await studentProfileService.listAbsences(ctx.auth.user!.organizationId, ctx.params.id)
    return ctx.response.ok({ data })
  }

  async listViolations(ctx: HttpContext) {
    try {
      await assertCanAccessStudentProfile(ctx, ctx.params.id)
    } catch {
      return ctx.response.forbidden({ message: 'Forbidden' })
    }
    const data = await studentProfileService.listViolations(ctx.auth.user!.organizationId, ctx.params.id)
    return ctx.response.ok({ data })
  }

  async recordViolation(ctx: HttpContext) {
    const user = ctx.auth.user!
    const payload = await ctx.request.validateUsing(violationValidator)
    const data = await studentProfileService.recordViolation(
      user.organizationId,
      ctx.params.id,
      payload,
      user.id
    )
    return ctx.response.created({ data })
  }

  async updateViolation(ctx: HttpContext) {
    const user = ctx.auth.user!
    const payload = await ctx.request.validateUsing(violationUpdateValidator)
    const data = await studentProfileService.updateViolation(
      user.organizationId,
      ctx.params.violationId,
      payload,
      user.id
    )
    return ctx.response.ok({ data })
  }

  async retryPlatformLogin(ctx: HttpContext) {
    const user = ctx.auth.user!
    const student = await Student.query()
      .where('id', ctx.params.id)
      .where('organization_id', user.organizationId)
      .whereNull('deleted_at')
      .first()
    if (!student) {
      return ctx.response.notFound({ message: 'Student not found' })
    }
    const service = new StudentAccountService()
    const result = await service.retryPlatformLogin(student.id)
    return ctx.response.ok({
      data: {
        student: serializeStudent(result.student),
        loginEmail: result.loginEmail,
        provisioned: result.provisioned,
        provisionError: result.provisionError,
        temporaryPassword: result.temporaryPassword,
      },
    })
  }
}
