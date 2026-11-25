import { DateTime } from 'luxon'
import env from '#start/env'
import User from '#modules/enrollment/models/user'
import Role from '#modules/enrollment/models/role'
import Section from '#modules/enrollment/models/section'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import { GradeRecordsService } from '#modules/enrollment/services/grade_records_service'

export const DEMO_FACULTY_EMAIL = 'faculty@identity.local'

export type SeedFacultyDemoInput = {
  organizationId: string
  academicYearId: string
  semester: number
  sectionIds: string[]
  actorUserId: string
}

export type SeedFacultyDemoResult = {
  facultyUserId: string
  email: string
  assignments: number
}

export async function seedFacultyDemo(input: SeedFacultyDemoInput): Promise<SeedFacultyDemoResult> {
  const demoPassword = env.get('DEMO_SEED_PASSWORD') || 'ChangeMe123!'
  const platformUserId = env.get('ENROLLMENT_DEMO_FACULTY_PLATFORM_USER_ID')?.trim() || null

  const adviserRole = await Role.query()
    .where('organization_id', input.organizationId)
    .where('slug', 'adviser')
    .firstOrFail()

  const faculty = await User.updateOrCreate(
    { organizationId: input.organizationId, email: DEMO_FACULTY_EMAIL },
    {
      organizationId: input.organizationId,
      email: DEMO_FACULTY_EMAIL,
      password: demoPassword,
      fullName: 'Demo Faculty Adviser',
      status: 'active',
      platformUserId,
    }
  )

  await faculty.related('roles').sync({
    [adviserRole.id]: { organization_id: input.organizationId },
  })

  const gradeRecords = new GradeRecordsService()
  let assignments = 0

  for (const sectionId of input.sectionIds) {
    await gradeRecords.assignFaculty({
      organizationId: input.organizationId,
      sectionId,
      facultyUserId: faculty.id,
      academicYearId: input.academicYearId,
      semester: input.semester,
      assignedBy: input.actorUserId,
    })
    assignments += 1

    const meetings = await UsisSectionMeeting.query()
      .where('organization_id', input.organizationId)
      .where('section_id', sectionId)
    for (const meeting of meetings) {
      meeting.facultyUserId = faculty.id
      await meeting.save()
    }
  }

  for (const sectionId of input.sectionIds) {
    const section = await Section.find(sectionId)
    if (section && !section.enrolledCount) {
      section.enrolledCount = Math.max(section.enrolledCount, 1)
      await section.save()
    }
  }

  faculty.updatedAt = DateTime.now()
  await faculty.save()

  return {
    facultyUserId: faculty.id,
    email: DEMO_FACULTY_EMAIL,
    assignments,
  }
}
