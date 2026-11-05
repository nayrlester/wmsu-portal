import type { HttpContext } from '@adonisjs/core/http'
import { alumniProfileService } from '#modules/records/services/torms/alumni_profile_service'

export default class AlumniController {
  async createFromGraduation({ request, response }: HttpContext) {
    const payload = request.only([
      'organizationId',
      'studentNumber',
      'firstName',
      'middleName',
      'lastName',
      'email',
      'mobile',
      'programCode',
      'degreeTitle',
      'graduationYear',
      'collegeCode',
      'location',
    ])

    try {
      const result = await alumniProfileService.ensureFromGraduation({
        organizationId: payload.organizationId,
        studentNumber: payload.studentNumber,
        firstName: payload.firstName,
        middleName: payload.middleName,
        lastName: payload.lastName,
        email: payload.email,
        mobile: payload.mobile,
        programCode: payload.programCode,
        degreeTitle: payload.degreeTitle,
        graduationYear: payload.graduationYear,
        collegeCode: payload.collegeCode,
        location: payload.location,
      })
      return response.status(result.created ? 201 : 200).send({
        success: true,
        message: result.created ? 'Alumni profile created' : 'Alumni profile already exists',
        data: result.profile,
      })
    } catch (error) {
      const status = (error as Error & { status?: number }).status ?? 500
      const message = error instanceof Error ? error.message : 'Request failed'
      if (status >= 400 && status < 600) {
        return response.status(status).send({ success: false, message })
      }
      throw error
    }
  }
}
