import env from '#start/env'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import AcademicYear from '#modules/enrollment/models/academic_year'
import Program from '#modules/enrollment/models/program'
import Subject from '#modules/enrollment/models/subject'
import Section from '#modules/enrollment/models/section'
import Student from '#modules/enrollment/models/student'
import Enrollment from '#modules/enrollment/models/enrollment'
import AdvisingPeriod from '#modules/enrollment/models/advising_period'
import UsisRoomCategory from '#modules/enrollment/models/usis_room_category'
import UsisBuilding from '#modules/enrollment/models/usis_building'
import UsisRoom from '#modules/enrollment/models/usis_room'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import UsisCurriculum from '#modules/enrollment/models/usis_curriculum'
import UsisCurriculumVersion from '#modules/enrollment/models/usis_curriculum_version'
import UsisCurriculumVersionSubject from '#modules/enrollment/models/usis_curriculum_version_subject'
import { CurriculumService } from '#modules/enrollment/services/curriculum_service'
import User from '#modules/enrollment/models/user'

export type SeedAcademicSetupResult = {
  orgId: string
  academicYearId: string
  programId: string
  studentId: string
  studentNumber: string
  enrollmentId: string
  sectionCodes: string[]
  blockGroupCode: string
}

export async function seedAcademicSetup(orgCode = 'UNI'): Promise<SeedAcademicSetupResult | null> {
  const org = await Organization.findBy('code', orgCode)
  if (!org) return null

  const seededUser = await User.query().where('organization_id', org.id).orderBy('created_at', 'asc').first()
  const actorUserId =
    env.get('ENROLLMENT_SEED_ACTOR_USER_ID')?.trim() || seededUser?.id || org.id
  const studentPlatformUserId =
    env.get('ENROLLMENT_DEMO_STUDENT_PLATFORM_USER_ID')?.trim() ||
    'c9ee94e7-1100-4757-81d3-9e599717cb67'
  const facultyUserId = actorUserId

  const year = await AcademicYear.updateOrCreate(
    { organizationId: org.id, code: 'AY2025-26' },
    {
      organizationId: org.id,
      code: 'AY2025-26',
      name: 'Academic Year 2025–2026',
      startDate: DateTime.fromISO('2025-08-01'),
      endDate: DateTime.fromISO('2026-07-31'),
      isActive: true,
    }
  )

  await AcademicYear.query()
    .where('organization_id', org.id)
    .whereNot('id', year.id)
    .update({ is_active: false })

  const program = await Program.updateOrCreate(
    { organizationId: org.id, code: 'BSIT' },
    {
      organizationId: org.id,
      code: 'BSIT',
      name: 'Bachelor of Science in Information Technology',
      degreeLevel: 'undergraduate',
      years: 4,
      isActive: true,
    }
  )

  const subjectDefs = [
    { code: 'IT101', title: 'Introduction to Computing', units: 3 },
    { code: 'IT102', title: 'Programming Fundamentals', units: 3 },
    { code: 'GE101', title: 'Understanding the Self', units: 3 },
  ]

  const subjects: Subject[] = []
  for (const def of subjectDefs) {
    const row = await Subject.updateOrCreate(
      { organizationId: org.id, subjectCode: def.code },
      {
        organizationId: org.id,
        subjectCode: def.code,
        title: def.title,
        units: def.units,
        lectureHours: def.units,
        laboratoryHours: 0,
        programId: program.id,
        isActive: true,
      }
    )
    subjects.push(row)
  }

  const curriculumService = new CurriculumService()
  let curriculum = await UsisCurriculum.query()
    .where('organization_id', org.id)
    .where('program_id', program.id)
    .where('code', 'BSIT-CURR')
    .first()

  let version: UsisCurriculumVersion | null = null
  if (!curriculum) {
    const created = await curriculumService.createCurriculum(
      org.id,
      { programId: program.id, code: 'BSIT-CURR', name: 'BSIT Standard Curriculum', versionLabel: '2025' },
      actorUserId
    )
    curriculum = created.curriculum
    version = created.version
  } else {
    version =
      (await UsisCurriculumVersion.query()
        .where('organization_id', org.id)
        .where('curriculum_id', curriculum.id)
        .orderBy('created_at', 'desc')
        .first()) ?? null
  }

  if (version && version.status !== 'active') {
    for (let i = 0; i < subjects.length; i++) {
      const subj = subjects[i]!
      const exists = await UsisCurriculumVersionSubject.query()
        .where('curriculum_version_id', version.id)
        .where('subject_id', subj.id)
        .first()
      if (!exists) {
        await UsisCurriculumVersionSubject.create({
          organizationId: org.id,
          curriculumVersionId: version.id,
          subjectId: subj.id,
          yearLevel: 1,
          semester: 1,
          sortOrder: i + 1,
          isRequired: true,
        })
      }
    }
    await curriculumService.activateVersion(org.id, version.id, actorUserId)
  }

  const category = await UsisRoomCategory.updateOrCreate(
    { organizationId: org.id, code: 'LEC' },
    { organizationId: org.id, code: 'LEC', name: 'Lecture' }
  )

  const building = await UsisBuilding.updateOrCreate(
    { organizationId: org.id, code: 'SCI' },
    {
      organizationId: org.id,
      code: 'SCI',
      name: 'Science Building',
      campusCode: 'MAIN',
      isActive: true,
    }
  )

  const room = await UsisRoom.updateOrCreate(
    { organizationId: org.id, code: 'SCI-201' },
    {
      organizationId: org.id,
      buildingId: building.id,
      categoryId: category.id,
      code: 'SCI-201',
      name: 'Science 201',
      capacity: 45,
      isActive: true,
    }
  )

  const blockGroupCode = 'BSIT-1A'
  const sectionDefs = [
    { code: 'IT101-A', name: 'IT101 Section A', subject: subjects[0]! },
    { code: 'IT102-A', name: 'IT102 Section A', subject: subjects[1]! },
    { code: 'GE101-A', name: 'GE101 Section A', subject: subjects[2]! },
  ]

  const sectionRows: Section[] = []
  for (const def of sectionDefs) {
    const section = await Section.updateOrCreate(
      {
        organizationId: org.id,
        academicYearId: year.id,
        code: def.code,
        semester: 1,
      },
      {
        organizationId: org.id,
        academicYearId: year.id,
        programId: program.id,
        code: def.code,
        name: def.name,
        yearLevel: 1,
        semester: 1,
        capacity: 40,
        subjectId: def.subject.id,
        isBlockSection: true,
        blockGroupCode,
        status: 'open',
        enrolledCount: 0,
        waitlistEnabled: true,
      }
    )
    sectionRows.push(section)

    const meetingExists = await UsisSectionMeeting.query()
      .where('organization_id', org.id)
      .where('section_id', section.id)
      .first()
    if (!meetingExists) {
      await UsisSectionMeeting.create({
        organizationId: org.id,
        sectionId: section.id,
        dayOfWeek: 1,
        startMinute: 8 * 60,
        endMinute: 9 * 60 + 30,
        roomCode: room.code,
        facultyUserId,
      })
    }
  }

  await AdvisingPeriod.updateOrCreate(
    {
      organizationId: org.id,
      academicYearId: year.id,
      semester: 1,
    },
    {
      organizationId: org.id,
      academicYearId: year.id,
      semester: 1,
      startsAt: DateTime.fromISO('2025-01-01'),
      endsAt: DateTime.fromISO('2030-12-31'),
      enforceCutoff: false,
    }
  )

  const studentNumber = 'DEMO-2026-001'
  const student = await Student.updateOrCreate(
    { organizationId: org.id, studentNumber },
    {
      organizationId: org.id,
      studentNumber,
      firstName: 'Demo',
      lastName: 'Student',
      middleName: null,
      email: 'student@identity.local',
      mobile: null,
      birthDate: null,
      programId: program.id,
      status: 'active',
      classification: 'freshman',
      yearLevel: 1,
      platformUserId: studentPlatformUserId,
    }
  )

  const enrollment = await Enrollment.updateOrCreate(
    {
      organizationId: org.id,
      studentId: student.id,
      academicYearId: year.id,
      semester: 1,
    },
    {
      organizationId: org.id,
      studentId: student.id,
      academicYearId: year.id,
      yearLevel: 1,
      semester: 1,
      classification: 'freshman',
      status: 'draft',
      isRegularBlock: true,
    }
  )

  return {
    orgId: org.id,
    academicYearId: year.id,
    programId: program.id,
    studentId: student.id,
    studentNumber,
    enrollmentId: enrollment.id,
    sectionCodes: sectionRows.map((s) => s.code),
    blockGroupCode,
  }
}
