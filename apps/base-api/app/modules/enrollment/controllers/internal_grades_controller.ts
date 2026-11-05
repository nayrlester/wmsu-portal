import type { HttpContext } from '@adonisjs/core/http'
import Student from '#modules/enrollment/models/student'
import { GradeRecordsService } from '#modules/enrollment/services/grade_records_service'

export default class InternalGradesController {
  async exportStudentGrades({ params, request, response }: HttpContext) {
    const studentNumber = params.studentNumber
    const organizationId = String(request.input('organizationId') ?? '')

    const studentQuery = Student.query().where('student_number', studentNumber).preload('program')
    if (organizationId) studentQuery.where('organization_id', organizationId)
    const student = await studentQuery.firstOrFail()

    const service = new GradeRecordsService()
    const records = await service.academicRecordsForStudent(student.organizationId, student.id)

    return response.ok({
      success: true,
      data: {
        student: records.student,
        grades: records.grades,
        gwa: records.gwa,
        history: records.history.map((h) => ({
          gradeEntryId: h.gradeEntryId,
          oldMarkCode: h.oldMarkCode,
          newMarkCode: h.newMarkCode,
          cause: h.cause,
          createdAt: h.createdAt,
        })),
        meta: {
          note: 'Approved academic records from USiS. Transcript generation is owned by TORMS.',
        },
      },
    })
  }
}
