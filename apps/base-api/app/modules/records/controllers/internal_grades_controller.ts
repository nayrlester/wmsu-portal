import type { HttpContext } from '@adonisjs/core/http'
import { academicSyncService } from '#modules/records/services/torms/academic_sync_service'
import { gradesSyncValidator } from '#modules/records/validators/torms_foundation'

export default class InternalGradesController {
  async syncGrades({ request, response }: HttpContext) {
    const payload = await request.validateUsing(gradesSyncValidator)

    const result = await academicSyncService.ingestGrades({
      organizationId: payload.organizationId,
      studentNumber: payload.studentNumber,
      grades: payload.grades.map((g) => ({
        academicYear: g.academicYear,
        semester: g.semester,
        courseCode: g.courseCode,
        courseTitle: g.courseTitle,
        units: g.units,
        grade: g.grade ?? null,
        remarks: g.remarks ?? null,
        sourceEntryId: g.sourceEntryId ?? '',
        originalGrade: g.originalGrade ?? null,
        modifiedGrade: g.modifiedGrade ?? null,
        programCode: g.programCode ?? null,
      })),
      source: 'usis_push',
    })

    return response.ok({
      success: true,
      data: {
        synced: result.upserted,
        syncRunId: result.syncRunId,
        received: result.received,
        discrepancies: result.discrepancies,
      },
    })
  }
}
