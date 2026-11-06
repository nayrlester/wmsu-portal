import type { HttpContext } from '@adonisjs/core/http'
import Student from '#modules/enrollment/models/student'
import { RecordsAlumniClient } from '#modules/enrollment/services/integrations/records_alumni_client'

export default class GraduationController {
  async graduate({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const student = await Student.query()
      .where('id', params.id)
      .where('organization_id', user.organizationId)
      .firstOrFail()

    const programCode = request.input('programCode', 'GENERAL')
    const graduationDate = request.input('graduationDate', new Date().toISOString().slice(0, 10))

    const alumni = new RecordsAlumniClient()
    await alumni.createFromGraduation({
      organizationId: user.organizationId,
      studentNumber: student.studentNumber,
      programCode: String(programCode),
      graduationDate: String(graduationDate),
      email: student.email,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      mobile: student.mobile,
    })

    if (student.status !== 'graduated') {
      student.status = 'graduated'
      await student.save()
    }

    return response.ok({ data: { student } })
  }
}
