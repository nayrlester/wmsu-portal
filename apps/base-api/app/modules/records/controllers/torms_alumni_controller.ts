import type { HttpContext } from '@adonisjs/core/http'
import { alumniProfileService } from '#modules/records/services/torms/alumni_profile_service'
import { rbacService } from '#modules/records/services/rbac_service'
import { listAlumniValidator, updateAlumniValidator } from '#modules/records/validators/alumni_reports'

async function isAlumniStaff(user: { id: string; organizationId: string; isAdmin?: boolean }) {
  if (user.isAdmin) return true
  const perms = await rbacService.getUserPermissions(user as never)
  return (
    perms.includes('torms.alumni.read') ||
    perms.includes('torms.alumni.write') ||
    perms.includes('torms.requests.process') ||
    perms.includes('torms.foundation.admin')
  )
}

function mapError(error: unknown, response: HttpContext['response']) {
  const status = (error as Error & { status?: number }).status ?? 500
  const message = error instanceof Error ? error.message : 'Request failed'
  if (status >= 400 && status < 600) {
    return response.status(status).send({ success: false, message })
  }
  throw error
}

export default class TormsAlumniController {
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isAlumniStaff(user)
      const filters = await request.validateUsing(listAlumniValidator)
      const data = await alumniProfileService.list({
        organizationId: user.organizationId,
        isStaff: staff,
        studentNumber: filters.studentNumber,
        q: filters.q,
        collegeCode: filters.collegeCode,
        programCode: filters.programCode,
        graduationYear: filters.graduationYear,
        location: filters.location,
        limit: filters.limit,
        offset: filters.offset,
      })
      return response.ok({ success: true, data: data.items, meta: data.meta })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isAlumniStaff(user)
      const data = await alumniProfileService.getByIdOrStudent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        actorEmail: user.email,
        isStaff: staff,
        idOrStudent: params.idOrStudent,
      })
      return response.ok({ success: true, data })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async me({ auth, response }: HttpContext) {
    const user = auth.user!
    try {
      const data = await alumniProfileService.getOwn({
        organizationId: user.organizationId,
        actorUserId: user.id,
        actorEmail: user.email,
      })
      return response.ok({ success: true, data })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isAlumniStaff(user)
      const payload = await request.validateUsing(updateAlumniValidator)
      const data = await alumniProfileService.update({
        organizationId: user.organizationId,
        actorUserId: user.id,
        actorEmail: user.email,
        isStaff: staff,
        idOrStudent: params.idOrStudent,
        email: payload.email,
        mobile: payload.mobile,
        employmentInfo: payload.employmentInfo,
        location: payload.location,
        consentProfileUpdate: payload.consentProfileUpdate,
        consentTracer: payload.consentTracer,
        visibilityPrefs: payload.visibilityPrefs,
      })
      return response.ok({ success: true, data })
    } catch (error) {
      return mapError(error, response)
    }
  }
}
