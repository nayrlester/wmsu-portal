import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/enrollment/middleware_registry'

const ApplicantsController = () => import('#modules/enrollment/controllers/applicants_controller')
const StudentsController = () => import('#modules/enrollment/controllers/students_controller')
const AcademicSetupController = () => import('#modules/enrollment/controllers/academic_setup_controller')
const EnrollmentsController = () => import('#modules/enrollment/controllers/enrollments_controller')
const AdvisingController = () => import('#modules/enrollment/controllers/advising_controller')
const GradesController = () => import('#modules/enrollment/controllers/grades_controller')
const GradeRecordsController = () => import('#modules/enrollment/controllers/grade_records_controller')
const AssessmentsController = () => import('#modules/enrollment/controllers/assessments_controller')
const AssessmentFinanceController = () => import('#modules/enrollment/controllers/assessment_finance_controller')
const PaymentsController = () => import('#modules/enrollment/controllers/payments_controller')
const ClearanceController = () => import('#modules/enrollment/controllers/clearance_controller')
const InternalGradesController = () => import('#modules/enrollment/controllers/internal_grades_controller')
const Phase2ModulesController = () => import('#modules/enrollment/controllers/phase2_modules_controller')
const SubjectsController = () => import('#modules/enrollment/controllers/subjects_controller')
const ScholarshipsController = () => import('#modules/enrollment/controllers/scholarships_controller')
const DeficienciesController = () => import('#modules/enrollment/controllers/deficiencies_controller')
const Phase2RecordsController = () => import('#modules/enrollment/controllers/phase2_records_controller')
const GraduationController = () => import('#modules/enrollment/controllers/graduation_controller')
const StudentSupportController = () => import('#modules/enrollment/controllers/student_support_controller')
const ReportsController = () => import('#modules/enrollment/controllers/reports_controller')
const AnnouncementsController = () => import('#modules/enrollment/controllers/announcements_controller')
const MassCommsController = () => import('#modules/enrollment/controllers/mass_comms_controller')
const FacultyEvalController = () => import('#modules/enrollment/controllers/faculty_eval_controller')
const StudentPortalController = () => import('#modules/enrollment/controllers/student_portal_controller')
const SchedulingController = () => import('#modules/enrollment/controllers/scheduling_controller')
const AcademicFacilitiesController = () =>
  import('#modules/enrollment/controllers/academic_facilities_controller')
const AcademicPoliciesController = () =>
  import('#modules/enrollment/controllers/academic_policies_controller')
const InstitutionalProfileController = () =>
  import('#modules/enrollment/controllers/institutional_profile_controller')
const AcademicStructureController = () =>
  import('#modules/enrollment/controllers/academic_structure_controller')
const AdmissionFormsController = () =>
  import('#modules/enrollment/controllers/admission_forms_controller')
const AdmissionEventsController = () =>
  import('#modules/enrollment/controllers/admission_events_controller')
const CurriculumController = () => import('#modules/enrollment/controllers/curriculum_controller')
const SubjectCreditsController = () =>
  import('#modules/enrollment/controllers/subject_credits_controller')
const StudentImportController = () =>
  import('#modules/enrollment/controllers/student_import_controller')

router
  .group(() => {
    router.get('/applicants', [ApplicantsController, 'index']).use(middleware.permission(['applicants.read']))
    router.post('/applicants', [ApplicantsController, 'store']).use(middleware.permission(['applicants.write']))
    router.get('/applicants/:id', [ApplicantsController, 'show']).use(middleware.permission(['applicants.read']))
    router.patch('/applicants/:id', [ApplicantsController, 'update']).use(middleware.permission(['applicants.write']))
    router.post('/applicants/:id/admit', [ApplicantsController, 'admit']).use(middleware.permission(['applicants.write']))
    router
      .get('/applicants/:id/status-history', [AdmissionEventsController, 'listStatusHistory'])
      .as('applicants.status_history')
      .use(middleware.permission(['applicants.read']))
    router
      .get('/applicants/:id/admission-results', [AdmissionEventsController, 'listApplicantResults'])
      .as('applicants.admission_results')
      .use(middleware.permission(['applicants.read']))

    router
      .get('/admissions/forms', [AdmissionFormsController, 'list'])
      .as('admissions.forms.list')
      .use(middleware.permission(['applicants.read', 'academic.read']))
    router
      .get('/admissions/forms/active', [AdmissionFormsController, 'active'])
      .as('admissions.forms.active')
      .use(middleware.permission(['applicants.read', 'academic.read', 'applicants.write']))
    router
      .post('/admissions/forms', [AdmissionFormsController, 'store'])
      .as('admissions.forms.store')
      .use(middleware.permission(['applicants.write', 'academic.write']))
    router
      .patch('/admissions/forms/:id', [AdmissionFormsController, 'update'])
      .as('admissions.forms.update')
      .use(middleware.permission(['applicants.write', 'academic.write']))

    router
      .get('/admissions/events', [AdmissionEventsController, 'listEvents'])
      .as('admissions.events.list')
      .use(middleware.permission(['applicants.read']))
    router
      .post('/admissions/events', [AdmissionEventsController, 'createEvent'])
      .as('admissions.events.store')
      .use(middleware.permission(['applicants.write']))
    router
      .patch('/admissions/events/:id', [AdmissionEventsController, 'updateEvent'])
      .as('admissions.events.update')
      .use(middleware.permission(['applicants.write']))
    router
      .get('/admissions/events/:id/results', [AdmissionEventsController, 'listEventResults'])
      .as('admissions.events.results')
      .use(middleware.permission(['applicants.read']))
    router
      .post('/admissions/events/assign', [AdmissionEventsController, 'assign'])
      .as('admissions.events.assign')
      .use(middleware.permission(['applicants.write']))
    router
      .post('/admissions/events/results', [AdmissionEventsController, 'recordResult'])
      .as('admissions.events.record_result')
      .use(middleware.permission(['applicants.write']))

    router.get('/students/me', [StudentsController, 'me']).use(middleware.permission(['students.self']))
    router
      .get('/students/me/profile', [StudentsController, 'myProfile'])
      .use(middleware.permission(['students.self', 'portal.student']))
      .as('students.me.profile')
    router.get('/student-portal/task-calendar', [StudentPortalController, 'taskCalendar']).use(
      middleware.permission(['students.self', 'portal.student'])
    )
    router.get('/student-portal/grade-feedback', [StudentPortalController, 'gradeFeedback']).use(
      middleware.permission(['students.self', 'portal.student', 'grades.read'])
    )
    router.get('/student-portal/enrollment-policy', [StudentPortalController, 'enrollmentPolicy']).use(
      middleware.permission(['students.self', 'portal.student'])
    )
    router.get('/student-portal/enrollment-workflow', [StudentPortalController, 'enrollmentWorkflow']).use(
      middleware.permission(['students.self', 'portal.student'])
    )
    router
      .get('/student-portal/curriculum-plan', [StudentPortalController, 'curriculumPlan'])
      .use(middleware.permission(['students.self', 'portal.student', 'advising.read']))
    router
      .get('/student-portal/academic-years', [StudentPortalController, 'openAcademicYears'])
      .use(middleware.permission(['students.self', 'portal.student']))
    router
      .get('/student-portal/course-choice', [StudentPortalController, 'courseChoice'])
      .use(middleware.permission(['students.self', 'portal.student']))
    router
      .post('/student-portal/course-choice', [StudentPortalController, 'selectCourse'])
      .use(middleware.permission(['students.self', 'portal.student']))
    router
      .post('/student-portal/enrollments/start', [StudentPortalController, 'startEnrollment'])
      .use(middleware.permission(['students.self', 'portal.student']))
    router.get('/students', [StudentsController, 'index']).use(middleware.permission(['students.read']))
    router
      .get('/students/classifications', [StudentsController, 'classifications'])
      .use(middleware.permission(['students.read', 'students.write', 'applicants.read', 'applicants.write']))
      .as('students.classifications')
    router
      .get('/students/merge-jobs', [StudentsController, 'mergeJobs'])
      .use(middleware.permission(['students.read', 'students.write']))
      .as('students.merge_jobs.index')
    router
      .post('/students/merge', [StudentsController, 'merge'])
      .use(middleware.permission(['students.write']))
      .as('students.merge')
    router
      .get('/students/import/batches', [StudentImportController, 'index'])
      .use(middleware.permission(['students.read', 'students.write']))
      .as('students.import.batches.index')
    router
      .post('/students/import', [StudentImportController, 'import'])
      .use(middleware.permission(['students.write']))
      .as('students.import.run')
    router
      .get('/students/import/batches/:id', [StudentImportController, 'show'])
      .use(middleware.permission(['students.read', 'students.write']))
      .as('students.import.batches.show')
    router
      .get('/students/import/batches/:id/rejections.csv', [StudentImportController, 'rejectionReport'])
      .use(middleware.permission(['students.read', 'students.write']))
      .as('students.import.batches.rejections_csv')
    router.get('/students/:id', [StudentsController, 'show']).use(middleware.permission(['students.read']))
    router
      .get('/students/:id/profile', [StudentsController, 'profile'])
      .use(middleware.permission(['students.read', 'students.self', 'grades.read']))
      .as('students.profile')
    router
      .get('/students/:id/absences', [StudentsController, 'absences'])
      .use(middleware.permission(['students.read', 'students.self', 'grades.read']))
      .as('students.absences')
    router
      .get('/students/:id/violations', [StudentsController, 'listViolations'])
      .use(middleware.permission(['students.read', 'students.self', 'grades.read']))
      .as('students.violations.index')
    router
      .post('/students/:id/violations', [StudentsController, 'recordViolation'])
      .use(middleware.permission(['students.write', 'grades.admin']))
      .as('students.violations.store')
    router
      .patch('/students/:id/violations/:violationId', [StudentsController, 'updateViolation'])
      .use(middleware.permission(['students.write', 'grades.admin']))
      .as('students.violations.update')
    router
      .patch('/students/:id', [StudentsController, 'update'])
      .use(middleware.permission(['students.write']))
      .as('students.update')
    router
      .get('/students/:studentId/curriculum-evaluation', [SubjectCreditsController, 'evaluate'])
      .use(middleware.permission(['students.read', 'academic.read', 'advising.read']))
      .as('students.curriculum_evaluation')
    router
      .get('/students/:studentId/subject-credits', [SubjectCreditsController, 'listCredits'])
      .use(middleware.permission(['students.read', 'academic.read']))
      .as('students.subject_credits.index')
    router
      .post('/students/:studentId/subject-credits/auto-internal', [SubjectCreditsController, 'autoInternal'])
      .use(middleware.permission(['students.write', 'academic.write']))
      .as('students.subject_credits.auto_internal')
    router
      .post('/students/:studentId/subject-credits/external', [SubjectCreditsController, 'submitExternal'])
      .use(middleware.permission(['students.write', 'academic.write']))
      .as('students.subject_credits.external')
    router
      .post('/students/:studentId/subject-credits/apply-equivalencies', [
        SubjectCreditsController,
        'applyEquivalencies',
      ])
      .use(middleware.permission(['students.write', 'academic.write']))
      .as('students.subject_credits.apply_equivalencies')
    router
      .patch('/students/:studentId/subject-credits/:creditId', [SubjectCreditsController, 'review'])
      .use(middleware.permission(['students.write', 'academic.write']))
      .as('students.subject_credits.review')
    router
      .get('/academic/subject-equivalencies', [SubjectCreditsController, 'listEquivalencies'])
      .use(middleware.permission(['academic.read']))
      .as('academic.subject_equivalencies.index')
    router
      .post('/academic/subject-equivalencies', [SubjectCreditsController, 'createEquivalency'])
      .use(middleware.permission(['academic.write']))
      .as('academic.subject_equivalencies.store')

    router.post('/scheduling/sections/:sectionId/meetings', [SchedulingController, 'upsertMeeting']).use(
      middleware.permission(['academic.write'])
    )
    router
      .get('/scheduling/sections/:sectionId/stored-conflicts', [SchedulingController, 'reviewStoredConflicts'])
      .use(middleware.permission(['academic.read', 'enrollments.read']))
      .as('scheduling.stored_conflicts')
    router.get('/scheduling/sections/:sectionId/summary', [SchedulingController, 'sectionSummary']).use(
      middleware.permission(['academic.read', 'students.self', 'enrollments.read'])
    )
    router.post('/scheduling/conflicts/check', [SchedulingController, 'checkConflicts']).use(
      middleware.permission(['students.self', 'enrollments.read'])
    )
    router.get('/scheduling/waitlist/mine', [SchedulingController, 'myWaitlist']).use(
      middleware.permission(['students.self'])
    )
    router.post('/scheduling/waitlist', [SchedulingController, 'joinWaitlist']).use(
      middleware.permission(['students.self'])
    )
    router
      .post('/scheduling/waitlist/:id/leave', [SchedulingController, 'leaveWaitlist'])
      .use(middleware.permission(['students.self']))
      .as('scheduling.waitlist.leave')
    router.get('/scheduling/sections/:sectionId/waitlist', [SchedulingController, 'sectionWaitlist']).use(
      middleware.permission(['enrollments.read', 'academic.read'])
    )
    router
      .post('/scheduling/sections/:sectionId/waitlist/promote', [SchedulingController, 'promoteWaitlist'])
      .use(middleware.permission(['enrollments.write', 'academic.write']))
      .as('scheduling.waitlist.promote')
    router
      .post('/scheduling/sections/:sectionId/meetings/conflicts', [SchedulingController, 'checkMeetingSlotConflicts'])
      .use(middleware.permission(['academic.read', 'academic.write']))
      .as('scheduling.meetings.conflicts')
    router.get('/scheduling/sections/:sectionId/meetings', [SchedulingController, 'listMeetings']).use(
      middleware.permission(['academic.read'])
    )
    router.get('/scheduling/sections/:sectionId/roster', [SchedulingController, 'sectionRoster']).use(
      middleware.permission(['enrollments.read', 'academic.read'])
    )
    router.patch('/scheduling/meetings/:meetingId', [SchedulingController, 'updateMeeting']).use(
      middleware.permission(['academic.write'])
    )
    router.delete('/scheduling/meetings/:meetingId', [SchedulingController, 'deleteMeeting']).use(
      middleware.permission(['academic.write'])
    )
    router.post('/scheduling/sections/:sectionId/drop-line', [SchedulingController, 'dropLine']).use(
      middleware.permission(['enrollments.write', 'academic.write'])
    )
    router.post('/scheduling/sections/:sectionId/transfer-line', [SchedulingController, 'transferLine']).use(
      middleware.permission(['enrollments.write', 'academic.write'])
    )
    router.post('/scheduling/sections/:sectionId/dissolve', [SchedulingController, 'dissolveSection']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/scheduling/notifications/mine', [SchedulingController, 'myScheduleNotifications']).use(
      middleware.permission(['students.self'])
    )
    router.get('/scheduling/notifications/faculty', [SchedulingController, 'facultyScheduleNotifications']).use(
      middleware.permission(['grades.read', 'academic.read', 'grades.write'])
    )
    router.post('/scheduling/notifications/:id/read', [SchedulingController, 'markNotificationRead']).use(
      middleware.permission(['students.self', 'grades.read', 'academic.read', 'grades.write'])
    )
    router.post('/scheduling/class-codes/resolve', [SchedulingController, 'resolveClassCodes']).use(
      middleware.permission(['students.self', 'enrollments.read', 'academic.read'])
    )
    router.post('/scheduling/alternate-sections/search', [SchedulingController, 'searchAlternateSections']).use(
      middleware.permission(['students.self', 'enrollments.read'])
    )
    router.post('/scheduling/class-codes/apply', [SchedulingController, 'applyClassCodes']).use(
      middleware.permission(['students.self', 'enrollments.write'])
    )
    router.post('/scheduling/block-groups/encode', [SchedulingController, 'encodeBlockGroup']).use(
      middleware.permission(['students.self', 'enrollments.write'])
    )

    router.get('/academic/years', [AcademicSetupController, 'listAcademicYears']).use(middleware.permission(['academic.read']))
    router.post('/academic/years', [AcademicSetupController, 'createAcademicYear']).use(middleware.permission(['academic.write']))
    router.patch('/academic/years/:id', [AcademicSetupController, 'updateAcademicYear']).use(middleware.permission(['academic.write']))
    router.delete('/academic/years/:id', [AcademicSetupController, 'deleteAcademicYear']).use(middleware.permission(['academic.write']))
    router.get('/academic/programs', [AcademicSetupController, 'listPrograms']).use(middleware.permission(['academic.read']))
    router.post('/academic/programs', [AcademicSetupController, 'createProgram']).use(middleware.permission(['academic.write']))
    router.patch('/academic/programs/:id', [AcademicSetupController, 'updateProgram']).use(middleware.permission(['academic.write']))
    router.delete('/academic/programs/:id', [AcademicSetupController, 'deleteProgram']).use(middleware.permission(['academic.write']))
    router.get('/academic/sections', [AcademicSetupController, 'listSections']).use(middleware.permission(['academic.read']))
    router.post('/academic/sections', [AcademicSetupController, 'createSection']).use(middleware.permission(['academic.write']))
    router.patch('/academic/sections/:id', [AcademicSetupController, 'updateSection']).use(middleware.permission(['academic.write']))
    router.delete('/academic/sections/:id', [AcademicSetupController, 'deleteSection']).use(middleware.permission(['academic.write']))

    router.get('/academic/room-categories', [AcademicFacilitiesController, 'listCategories']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/room-categories', [AcademicFacilitiesController, 'createCategory']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/academic/buildings', [AcademicFacilitiesController, 'listBuildings']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/buildings', [AcademicFacilitiesController, 'createBuilding']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/academic/rooms', [AcademicFacilitiesController, 'listRooms']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/rooms', [AcademicFacilitiesController, 'createRoom']).use(
      middleware.permission(['academic.write'])
    )

    router.get('/academic/policies', [AcademicPoliciesController, 'show']).use(
      middleware.permission(['academic.read'])
    )
    router.patch('/academic/policies', [AcademicPoliciesController, 'update']).use(
      middleware.permission(['academic.write'])
    )

    router.get('/academic/institution', [InstitutionalProfileController, 'show']).use(
      middleware.permission(['academic.read'])
    )
    router.patch('/academic/institution', [InstitutionalProfileController, 'update']).use(
      middleware.permission(['academic.write'])
    )
    router
      .post('/academic/institution/logo', [InstitutionalProfileController, 'uploadLogo'])
      .use(middleware.permission(['academic.write']))

    router.get('/academic/colleges', [AcademicStructureController, 'listColleges']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/colleges', [AcademicStructureController, 'createCollege']).use(
      middleware.permission(['academic.write'])
    )
    router.patch('/academic/colleges/:id', [AcademicStructureController, 'updateCollege']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/academic/structure-departments', [AcademicStructureController, 'listDepartments']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/structure-departments', [AcademicStructureController, 'createDepartment']).use(
      middleware.permission(['academic.write'])
    )
    router.patch('/academic/structure-departments/:id', [AcademicStructureController, 'updateDepartment']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/academic/positions', [AcademicStructureController, 'listPositions']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/positions', [AcademicStructureController, 'createPosition']).use(
      middleware.permission(['academic.write'])
    )
    router.patch('/academic/positions/:id', [AcademicStructureController, 'updatePosition']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/academic/subject-areas', [AcademicStructureController, 'listSubjectAreas']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/subject-areas', [AcademicStructureController, 'createSubjectArea']).use(
      middleware.permission(['academic.write'])
    )
    router.patch('/academic/subject-areas/:id', [AcademicStructureController, 'updateSubjectArea']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/academic/employee-assignments', [AcademicStructureController, 'listAssignments']).use(
      middleware.permission(['academic.read'])
    )
    router.post('/academic/employee-assignments', [AcademicStructureController, 'createAssignment']).use(
      middleware.permission(['academic.write'])
    )
    router.patch('/academic/employee-assignments/:id', [AcademicStructureController, 'updateAssignment']).use(
      middleware.permission(['academic.write'])
    )

    router.get('/academic/subjects', [SubjectsController, 'index']).use(
      middleware.permission(['academic.read', 'subjects.read'])
    )
    router.post('/academic/subjects', [SubjectsController, 'store']).use(middleware.permission(['academic.write']))
    router
      .patch('/academic/subjects/:id', [CurriculumController, 'updateSubject'])
      .use(middleware.permission(['academic.write']))
      .as('academic.subjects.update')
    router
      .delete('/academic/subjects/:id', [CurriculumController, 'deleteSubject'])
      .use(middleware.permission(['academic.write']))
      .as('academic.subjects.destroy')
    router
      .get('/academic/subjects/:id/prerequisites', [CurriculumController, 'listPrerequisites'])
      .use(middleware.permission(['academic.read', 'subjects.read']))
      .as('academic.subjects.prerequisites.index')
    router
      .post('/academic/subjects/:id/prerequisites', [CurriculumController, 'addPrerequisite'])
      .use(middleware.permission(['academic.write']))
      .as('academic.subjects.prerequisites.store')
    router
      .delete('/academic/subjects/:id/prerequisites/:linkId', [CurriculumController, 'removePrerequisite'])
      .use(middleware.permission(['academic.write']))
      .as('academic.subjects.prerequisites.destroy')
    router
      .get('/academic/subjects/:id/corequisites', [CurriculumController, 'listCorequisites'])
      .use(middleware.permission(['academic.read', 'subjects.read']))
      .as('academic.subjects.corequisites.index')
    router
      .post('/academic/subjects/:id/corequisites', [CurriculumController, 'addCorequisite'])
      .use(middleware.permission(['academic.write']))
      .as('academic.subjects.corequisites.store')
    router
      .delete('/academic/subjects/:id/corequisites/:linkId', [CurriculumController, 'removeCorequisite'])
      .use(middleware.permission(['academic.write']))
      .as('academic.subjects.corequisites.destroy')

    router
      .get('/academic/curricula', [CurriculumController, 'listCurricula'])
      .use(middleware.permission(['academic.read']))
      .as('academic.curricula.index')
    router
      .post('/academic/curricula', [CurriculumController, 'createCurriculum'])
      .use(middleware.permission(['academic.write']))
      .as('academic.curricula.store')
    router
      .patch('/academic/curricula/:id', [CurriculumController, 'updateCurriculum'])
      .use(middleware.permission(['academic.write']))
      .as('academic.curricula.update')
    router
      .delete('/academic/curricula/:id', [CurriculumController, 'deleteCurriculum'])
      .use(middleware.permission(['academic.write']))
      .as('academic.curricula.destroy')
    router
      .get('/academic/curricula/:id/versions', [CurriculumController, 'listVersions'])
      .use(middleware.permission(['academic.read']))
      .as('academic.curricula.versions.index')
    router
      .post('/academic/curricula/:id/versions', [CurriculumController, 'createVersion'])
      .use(middleware.permission(['academic.write']))
      .as('academic.curricula.versions.store')
    router
      .post('/academic/curriculum-versions/:versionId/duplicate', [CurriculumController, 'duplicateVersion'])
      .use(middleware.permission(['academic.write']))
      .as('academic.curriculum_versions.duplicate')
    router
      .patch('/academic/curriculum-versions/:versionId/status', [CurriculumController, 'updateVersionStatus'])
      .use(middleware.permission(['academic.write']))
      .as('academic.curriculum_versions.status')
    router
      .get('/academic/curriculum-versions/:versionId/subjects', [CurriculumController, 'listVersionSubjects'])
      .use(middleware.permission(['academic.read']))
      .as('academic.curriculum_versions.subjects.index')
    router
      .post('/academic/curriculum-versions/:versionId/subjects', [CurriculumController, 'addVersionSubject'])
      .use(middleware.permission(['academic.write']))
      .as('academic.curriculum_versions.subjects.store')
    router
      .delete(
        '/academic/curriculum-versions/:versionId/subjects/:lineId',
        [CurriculumController, 'removeVersionSubject']
      )
      .use(middleware.permission(['academic.write']))
      .as('academic.curriculum_versions.subjects.destroy')

    router.get('/enrollments', [EnrollmentsController, 'index']).use(
      middleware.permission(['enrollments.read', 'students.self'])
    )
    router.post('/enrollments', [EnrollmentsController, 'store']).use(middleware.permission(['enrollments.write']))
    router.post('/enrollments/advise', [EnrollmentsController, 'advise']).use(middleware.permission(['enrollments.write']))
    router.post('/enrollments/assess', [EnrollmentsController, 'assess']).use(middleware.permission(['enrollments.write']))
    router.post('/enrollments/overrides', [EnrollmentsController, 'override']).use(
      middleware.permission(['enrollments.override', 'enrollments.write'])
    )
    router.get('/enrollments/changes', [EnrollmentsController, 'listChangeRequests']).use(
      middleware.permission(['enrollments.read'])
    )
    router.post('/enrollments/changes', [EnrollmentsController, 'requestChange']).use(
      middleware.permission(['enrollments.write'])
    )
    router.post('/enrollments/changes/:id/decide', [EnrollmentsController, 'decideChange']).use(
      middleware.permission(['enrollments.write'])
    )
    router.post('/enrollments/change-windows', [EnrollmentsController, 'upsertChangeWindow']).use(
      middleware.permission(['academic.write'])
    )
    router.post('/enrollments/unit-load-policies', [EnrollmentsController, 'upsertUnitLoadPolicy']).use(
      middleware.permission(['academic.write'])
    )
    router.post('/enrollments/:id/verify-payment', [EnrollmentsController, 'verifyPayment']).use(
      middleware.permission(['enrollments.write', 'payments.write'])
    )
    router.post('/enrollments/:id/registrar-approve', [EnrollmentsController, 'registrarApprove']).use(
      middleware.permission(['enrollments.write'])
    )
    router.post('/enrollments/:id/register', [EnrollmentsController, 'register']).use(middleware.permission(['enrollments.write']))
    router.post('/enrollments/:id/reject', [EnrollmentsController, 'reject']).use(middleware.permission(['enrollments.write']))
    router.post('/enrollments/:id/incomplete', [EnrollmentsController, 'incomplete']).use(
      middleware.permission(['enrollments.write'])
    )
    router.get('/enrollments/:id/workflow', [EnrollmentsController, 'workflow']).use(
      middleware.permission(['enrollments.read', 'students.self'])
    )
    router.get('/enrollments/:id', [EnrollmentsController, 'show']).use(
      middleware.permission(['enrollments.read', 'students.self'])
    )

    router.get('/advising/assignments', [AdvisingController, 'listAssignments']).use(middleware.permission(['advising.read']))
    router.post('/advising/assignments', [AdvisingController, 'assignAdviser']).use(middleware.permission(['advising.write']))
    router.post('/advising/assignments/:id/reassign', [AdvisingController, 'reassignAdviser']).use(
      middleware.permission(['advising.write'])
    )
    router.post('/advising/periods', [AdvisingController, 'upsertPeriod']).use(middleware.permission(['advising.write']))
    router.post('/advising/sessions', [AdvisingController, 'startSession']).use(middleware.permission(['advising.write']))
    router.get('/advising/sessions/:id', [AdvisingController, 'sessionShow']).use(middleware.permission(['advising.read']))
    router.get('/advising/sessions/:id/recommendations', [AdvisingController, 'listRecommendations']).use(
      middleware.permission(['advising.read'])
    )
    router.post('/advising/sessions/:id/recommendations', [AdvisingController, 'addRecommendation']).use(
      middleware.permission(['advising.write'])
    )
    router.delete('/advising/sessions/:id/recommendations/:recommendationId', [AdvisingController, 'removeRecommendation']).use(
      middleware.permission(['advising.write'])
    )
    router.post('/advising/sessions/:id/course', [AdvisingController, 'assignCourse']).use(
      middleware.permission(['advising.write'])
    )
    router.post('/advising/sessions/:id/endorse', [AdvisingController, 'endorse']).use(
      middleware.permission(['advising.write'])
    )
    router.post('/advising/waivers', [AdvisingController, 'waiver']).use(middleware.permission(['advising.write']))
    router.get('/advising/students/:studentId/curriculum-evaluation', [AdvisingController, 'curriculumEvaluation']).use(
      middleware.permission(['advising.read'])
    )
    router.get('/advising/enrollments/:enrollmentId/history', [AdvisingController, 'history']).use(
      middleware.permission(['advising.read'])
    )
    router.get('/advising/dashboard', [AdvisingController, 'dashboard']).use(middleware.permission(['advising.read']))

    router.get('/grades', [GradesController, 'index']).use(middleware.permission(['grades.read']))
    router.post('/grades/submit', [GradesController, 'submit']).use(middleware.permission(['grades.write']))

    router.post('/grades/schemes', [GradeRecordsController, 'upsertScheme']).use(
      middleware.permission(['grades.admin', 'academic.write'])
    )
    router.get('/grades/schemes', [GradeRecordsController, 'listSchemes']).use(
      middleware.permission(['grades.read', 'grades.admin'])
    )
    router.post('/grades/deadlines', [GradeRecordsController, 'upsertDeadline']).use(
      middleware.permission(['grades.admin', 'academic.write'])
    )
    router.get('/grades/deadlines', [GradeRecordsController, 'listDeadlines']).use(
      middleware.permission(['grades.read', 'grades.admin'])
    )
    router.post('/grades/faculty-assignments', [GradeRecordsController, 'assignFaculty']).use(
      middleware.permission(['grades.admin', 'academic.write'])
    )
    router.get('/grades/faculty-assignments/mine', [GradeRecordsController, 'myAssignments']).use(
      middleware.permission(['grades.read', 'grades.write'])
    )
    router.get('/grades/class-records', [GradeRecordsController, 'listClassRecords']).use(
      middleware.permission(['grades.read'])
    )
    router.post('/grades/class-records/open', [GradeRecordsController, 'openClassRecord']).use(
      middleware.permission(['grades.write'])
    )
    router.post('/grades/class-records/:id/roster', [GradeRecordsController, 'enlist']).use(
      middleware.permission(['grades.write'])
    )
    router.get('/grades/class-records/:id/master-list', [GradeRecordsController, 'classMasterList']).use(
      middleware.permission(['grades.read'])
    )
    router.get('/grades/class-records/:id/report/export', [GradeRecordsController, 'exportGradeReport']).use(
      middleware.permission(['grades.read', 'grades.write'])
    )
    router.get('/grades/class-records/:id/report', [GradeRecordsController, 'gradeReport']).use(
      middleware.permission(['grades.read'])
    )
    router.post('/grades/encode', [GradeRecordsController, 'encode']).use(
      middleware.permission(['grades.write'])
    )
    router.post('/grades/class-records/submit', [GradeRecordsController, 'submit']).use(
      middleware.permission(['grades.write'])
    )
    router.post('/grades/corrections', [GradeRecordsController, 'requestCorrection']).use(
      middleware.permission(['grades.write'])
    )
    router.get('/grades/corrections', [GradeRecordsController, 'listCorrections']).use(
      middleware.permission(['grades.read', 'grades.approve'])
    )
    router.post('/grades/corrections/:id/decide', [GradeRecordsController, 'decideCorrection']).use(
      middleware.permission(['grades.approve'])
    )
    router.get('/grades/entries/:id/history', [GradeRecordsController, 'entryHistory']).use(
      middleware.permission(['grades.read'])
    )
    router.get('/grades/students/:studentId/academic-records', [GradeRecordsController, 'studentAcademicRecords']).use(
      middleware.permission(['grades.read', 'students.read', 'students.self'])
    )
    router.post('/grades/students/:studentId/gwa', [GradeRecordsController, 'computeGwa']).use(
      middleware.permission(['grades.read', 'grades.admin'])
    )
    router.post('/grades/inc-conversions/run', [GradeRecordsController, 'convertIncompletes']).use(
      middleware.permission(['grades.admin'])
    )
    router.post('/grades/attendance', [GradeRecordsController, 'recordAttendance']).use(
      middleware.permission(['grades.write'])
    )

    router.get('/assessments', [AssessmentsController, 'index']).use(middleware.permission(['assessments.read']))
    router.post('/assessments/prepare', [AssessmentFinanceController, 'prepare']).use(
      middleware.permission(['assessments.write', 'enrollments.write'])
    )
    router.post('/assessments/fee-schedules', [AssessmentFinanceController, 'upsertFeeSchedule']).use(
      middleware.permission(['academic.write'])
    )
    router.get('/assessments/fee-schedules', [AssessmentFinanceController, 'listFeeSchedules']).use(
      middleware.permission(['assessments.read'])
    )
    router.post('/assessments/aid-tags', [AssessmentFinanceController, 'tagAid']).use(
      middleware.permission(['scholarships.write', 'assessments.write'])
    )
    router.get('/assessments/aid-tags', [AssessmentFinanceController, 'listAidTags']).use(
      middleware.permission(['scholarships.read', 'assessments.read'])
    )
    router.post('/assessments/documents', [AssessmentFinanceController, 'issueDocument']).use(
      middleware.permission(['enrollments.write', 'assessments.write', 'students.self'])
    )
    router.get('/assessments/documents', [AssessmentFinanceController, 'listDocuments']).use(
      middleware.permission(['assessments.read', 'students.self'])
    )
    router.get('/assessments/documents/verify/:qrToken', [AssessmentFinanceController, 'verifyDocument'])
    router.get('/assessments/integration-transactions', [AssessmentFinanceController, 'integrationHistory']).use(
      middleware.permission(['assessments.read'])
    )
    router
      .get('/assessments/me/monitor', [AssessmentFinanceController, 'myMonitor'])
      .use(middleware.permission(['students.self', 'assessments.read', 'deficiencies.read']))
      .as('assessments.me.monitor')
    router.get('/assessments/students/:studentId/monitor', [AssessmentFinanceController, 'studentMonitor']).use(
      middleware.permission(['assessments.read', 'deficiencies.read', 'students.read'])
    )
    router.get('/assessments/:id', [AssessmentFinanceController, 'show']).use(middleware.permission(['assessments.read']))
    router.post('/assessments/:id/submit-ufms', [AssessmentFinanceController, 'submitToUfms']).use(
      middleware.permission(['assessments.write'])
    )
    router.post('/assessments/:id/sync-payment-status', [AssessmentFinanceController, 'syncPaymentStatus']).use(
      middleware.permission(['assessments.write', 'payments.write'])
    )

    router.get('/payments', [PaymentsController, 'index']).use(middleware.permission(['payments.read']))
    router.post('/payments', [PaymentsController, 'store']).use(middleware.permission(['payments.write']))

    router.post('/clearance/reports', [ClearanceController, 'issueReport']).use(middleware.permission(['clearance.read']))
    router.get('/clearance/reports', [ClearanceController, 'listReports']).use(middleware.permission(['clearance.read']))
    router.get('/clearance/reports/:token', [ClearanceController, 'showReport']).use(middleware.permission(['clearance.read']))
    router
      .get('/clearance/reports/:token/pdf', [ClearanceController, 'downloadReportPdf'])
      .use(middleware.permission(['clearance.read']))
      .as('clearance.reports.pdf')
    router
      .get('/clearance/office-requirements', [ClearanceController, 'listOfficeRequirements'])
      .use(middleware.permission(['clearance.read', 'clearance.write']))
      .as('clearance.office_requirements.index')
    router
      .post('/clearance/office-requirements', [ClearanceController, 'upsertOfficeRequirement'])
      .use(middleware.permission(['clearance.write', 'clearance.read', 'sss.admin']))
      .as('clearance.office_requirements.store')
    router
      .post('/clearance/students/:studentId/office-sync', [ClearanceController, 'syncStudentOfficeClearance'])
      .use(middleware.permission(['clearance.write', 'clearance.read', 'sss.admin']))
      .as('clearance.students.office_sync')
    router
      .get('/clearance/students/:studentId/office', [ClearanceController, 'getStudentOfficeClearance'])
      .use(middleware.permission(['clearance.read', 'sss.admin']))
      .as('clearance.students.office')
    router
      .patch('/clearance/office-items/:id', [ClearanceController, 'advanceOfficeClearanceItem'])
      .use(middleware.permission(['clearance.write', 'clearance.read', 'sss.admin']))
      .as('clearance.office_items.advance')
    router.get('/clearance/:studentNumber', [ClearanceController, 'checkClearance']).use(middleware.permission(['clearance.read']))

    router.get('/scholarships', [ScholarshipsController, 'index']).use(middleware.permission(['scholarships.read']))
    router.post('/scholarships', [ScholarshipsController, 'store']).use(middleware.permission(['scholarships.write']))

    router.post('/sss/staff-assignments', [StudentSupportController, 'assignStaff']).use(
      middleware.permission(['sss.admin'])
    )
    router.post('/sss/service-requests', [StudentSupportController, 'createRequest']).use(
      middleware.permission(['guidance.write', 'health.write', 'osa.write', 'scholarships.write'])
    )
    router.post('/sss/queue/tickets', [StudentSupportController, 'queueTicket']).use(
      middleware.permission(['guidance.write', 'health.write', 'osa.write', 'enrollments.write', 'queue.self'])
    )
    router
      .get('/sss/queue/tickets', [StudentSupportController, 'listQueueTickets'])
      .use(
        middleware.permission([
          'guidance.read',
          'health.read',
          'osa.read',
          'enrollments.read',
          'queue.self',
          'guidance.write',
          'health.write',
          'osa.write',
        ])
      )
      .as('sss.queue.tickets.index')
    router
      .get('/sss/queue/display', [StudentSupportController, 'queueDisplayStatus'])
      .use(
        middleware.permission([
          'guidance.read',
          'health.read',
          'osa.read',
          'enrollments.read',
          'queue.self',
          'guidance.write',
          'health.write',
          'osa.write',
        ])
      )
      .as('sss.queue.display')
    router
      .get('/sss/queue/reports/analytics', [StudentSupportController, 'queueAnalyticsReport'])
      .use(middleware.permission(['guidance.read', 'health.read', 'osa.read', 'enrollments.read', 'reports.read']))
      .as('sss.queue.reports.analytics')
    router
      .get('/sss/queue/tickets/:id', [StudentSupportController, 'getQueueTicket'])
      .use(
        middleware.permission([
          'guidance.read',
          'health.read',
          'osa.read',
          'enrollments.read',
          'queue.self',
          'guidance.write',
          'health.write',
          'osa.write',
        ])
      )
      .as('sss.queue.tickets.show')
    router
      .post('/sss/queue/tickets/:id/advance', [StudentSupportController, 'advanceQueueTicket'])
      .use(middleware.permission(['guidance.write', 'health.write', 'osa.write', 'enrollments.write']))
      .as('sss.queue.tickets.advance')
    router
      .get('/sss/queue/tickets/:id/slip.pdf', [StudentSupportController, 'queueTicketSlipPdf'])
      .use(
        middleware.permission([
          'guidance.read',
          'health.read',
          'osa.read',
          'enrollments.read',
          'queue.self',
          'guidance.write',
          'health.write',
          'osa.write',
        ])
      )
      .as('sss.queue.tickets.slip')
    router.get('/sss/offices/:office/report', [StudentSupportController, 'officeReport']).use(
      middleware.permission(['guidance.read', 'health.read', 'osa.read', 'scholarships.read', 'sss.admin'])
    )
    router.get('/sss/students/:studentId/clearance-hints', [StudentSupportController, 'clearanceHints']).use(
      middleware.permission(['clearance.read', 'sss.admin', 'students.self'])
    )
    router
      .get('/sss/students/:studentId/cross-office-clearance', [StudentSupportController, 'crossOfficeClearance'])
      .use(middleware.permission(['clearance.read', 'sss.admin', 'guidance.read', 'health.read', 'osa.read']))
      .as('sss.students.cross_office_clearance')
    router
      .get('/sss/students/:studentId/unified-profile', [StudentSupportController, 'unifiedStudentProfile'])
      .use(middleware.permission(['clearance.read', 'sss.admin', 'osa.read', 'guidance.read', 'health.read']))
      .as('sss.students.unified_profile')
    router
      .get('/sss/students/:studentId/referrals', [StudentSupportController, 'listStudentReferrals'])
      .use(middleware.permission(['guidance.read', 'health.read', 'osa.read', 'sss.admin']))
      .as('sss.students.referrals')
    router
      .get('/sss/students/:studentId/alerts', [StudentSupportController, 'listStudentAlerts'])
      .use(middleware.permission(['guidance.read', 'health.read', 'osa.read', 'sss.admin', 'students.self']))
      .as('sss.students.alerts')
    router
      .post('/sss/referrals', [StudentSupportController, 'createOfficeReferral'])
      .use(middleware.permission(['guidance.write', 'health.write', 'osa.write']))
      .as('sss.referrals.store')
    router.get('/sss/sensitive-access-logs', [StudentSupportController, 'sensitiveAccessLog']).use(
      middleware.permission(['sss.admin'])
    )

    router.post('/sss/guidance/counseling-requests', [StudentSupportController, 'counselingRequest']).use(
      middleware.permission(['guidance.write', 'counseling.self'])
    )
    router
      .get('/sss/guidance/counseling-requests', [StudentSupportController, 'listCounselingRequests'])
      .use(middleware.permission(['guidance.read', 'guidance.write']))
      .as('sss.guidance.counseling_requests.index')
    router
      .get('/sss/guidance/counseling-requests/:id', [StudentSupportController, 'getCounselingRequest'])
      .use(middleware.permission(['guidance.read', 'guidance.write']))
      .as('sss.guidance.counseling_requests.show')
    router
      .post('/sss/guidance/counseling-requests/:id/intake', [StudentSupportController, 'documentCounselingIntake'])
      .use(middleware.permission(['guidance.write', 'guidance.case_notes.write']))
      .as('sss.guidance.counseling_requests.intake')
    router
      .post('/sss/guidance/counseling-requests/:id/assign', [StudentSupportController, 'assignCounselingRequest'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.counseling_requests.assign')
    router
      .post('/sss/guidance/counseling-requests/:id/sessions', [StudentSupportController, 'recordCounselingSession'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.counseling_requests.sessions.store')
    router
      .post(
        '/sss/guidance/counseling-requests/:id/specialist-referral',
        [StudentSupportController, 'specialistCounselingReferral']
      )
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.counseling_requests.specialist_referral')
    router
      .post('/sss/guidance/counseling-requests/:id/resolve', [StudentSupportController, 'resolveCounselingRequest'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.counseling_requests.resolve')
    router
      .get('/sss/guidance/counseling/specialists', [StudentSupportController, 'counselingSpecialistCatalog'])
      .use(middleware.permission(['guidance.read', 'guidance.write']))
      .as('sss.guidance.counseling.specialists')
    router
      .get('/sss/guidance/counseling/reports/cases', [StudentSupportController, 'counselingCaseReport'])
      .use(middleware.permission(['guidance.read', 'reports.read']))
      .as('sss.guidance.counseling.reports.cases')
    router.post('/sss/guidance/case-notes', [StudentSupportController, 'writeCaseNote']).use(
      middleware.permission(['guidance.case_notes.write'])
    )
    router.get('/sss/guidance/counseling-requests/:id/case-notes', [StudentSupportController, 'readCaseNotes']).use(
      middleware.permission(['guidance.case_notes.read'])
    )
    router
      .get('/sss/guidance/psych/batteries', [StudentSupportController, 'psychBatteryCatalog'])
      .use(middleware.permission(['guidance.read', 'guidance.write']))
      .as('sss.guidance.psych.batteries')
    router
      .get('/sss/guidance/psych/schedules', [StudentSupportController, 'listPsychSchedules'])
      .use(middleware.permission(['guidance.read', 'guidance.write']))
      .as('sss.guidance.psych.schedules.index')
    router
      .post('/sss/guidance/psych/schedules', [StudentSupportController, 'schedulePsychTest'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.psych.schedules.store')
    router
      .patch('/sss/guidance/psych/schedules/:id', [StudentSupportController, 'updatePsychScheduleStatus'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.psych.schedules.update')
    router
      .get('/sss/guidance/psych/results', [StudentSupportController, 'listPsychResults'])
      .use(middleware.permission(['guidance.read', 'guidance.write']))
      .as('sss.guidance.psych.results.index')
    router
      .post('/sss/guidance/psych/results', [StudentSupportController, 'encodePsychResult'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.psych.results.store')
    router
      .get('/sss/guidance/psych/results/:id/report', [StudentSupportController, 'psychTestReport'])
      .use(middleware.permission(['guidance.read', 'guidance.write']))
      .as('sss.guidance.psych.results.report')
    router
      .post('/sss/guidance/psych/results/:id/release', [StudentSupportController, 'releasePsychResult'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.psych.results.release')
    router
      .get('/sss/guidance/shifting-exams', [StudentSupportController, 'listShiftingExams'])
      .use(middleware.permission(['guidance.read', 'guidance.write', 'admissions.read']))
      .as('sss.guidance.shifting.index')
    router
      .post('/sss/guidance/shifting-exams', [StudentSupportController, 'applyShiftingExam'])
      .use(middleware.permission(['guidance.write', 'students.self']))
      .as('sss.guidance.shifting.store')
    router
      .get('/sss/guidance/shifting-exams/:id', [StudentSupportController, 'getShiftingExam'])
      .use(middleware.permission(['guidance.read', 'guidance.write', 'admissions.read', 'students.self']))
      .as('sss.guidance.shifting.show')
    router
      .patch('/sss/guidance/shifting-exams/:id/requirements', [StudentSupportController, 'updateShiftingRequirements'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.shifting.requirements')
    router
      .post('/sss/guidance/shifting-exams/:id/schedule', [StudentSupportController, 'scheduleShiftingExam'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.shifting.schedule')
    router
      .post('/sss/guidance/shifting-exams/:id/payment-tag', [StudentSupportController, 'tagShiftingPayment'])
      .use(middleware.permission(['guidance.write', 'assessments.write']))
      .as('sss.guidance.shifting.payment')
    router
      .post('/sss/guidance/shifting-exams/:id/result-ready', [StudentSupportController, 'markShiftingResultReady'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.shifting.result_ready')
    router
      .post('/sss/guidance/shifting-exams/:id/release', [StudentSupportController, 'releaseShiftingResult'])
      .use(middleware.permission(['guidance.write']))
      .as('sss.guidance.shifting.release')
    router
      .post('/sss/guidance/shifting-exams/:id/endorse', [StudentSupportController, 'endorseShiftingExam'])
      .use(middleware.permission(['guidance.write', 'admissions.write', 'programs.write']))
      .as('sss.guidance.shifting.endorse')

    router.post('/sss/health/encounters', [StudentSupportController, 'healthEncounter']).use(
      middleware.permission(['health.write', 'health.clinical.write'])
    )
    router.get('/sss/health/encounters/:id/clinical-notes', [StudentSupportController, 'readClinicalNotes']).use(
      middleware.permission(['health.clinical.read'])
    )
    router.post('/sss/health/clearances', [StudentSupportController, 'healthClearance']).use(
      middleware.permission(['health.write'])
    )
    router
      .get('/sss/health/programs/catalog', [StudentSupportController, 'healthProgramCatalog'])
      .use(middleware.permission(['health.read', 'health.write']))
      .as('sss.health.programs.catalog')
    router
      .get('/sss/health/programs', [StudentSupportController, 'listHealthPrograms'])
      .use(middleware.permission(['health.read', 'health.write']))
      .as('sss.health.programs.index')
    router
      .post('/sss/health/programs', [StudentSupportController, 'recordHealthProgram'])
      .use(middleware.permission(['health.write']))
      .as('sss.health.programs.store')
    router
      .post('/sss/health/medical-assessments', [StudentSupportController, 'medicalAssessment'])
      .use(middleware.permission(['health.write']))
      .as('sss.health.medical_assessments.store')
    router
      .get('/sss/health/students/:studentId/enrollment-gate', [StudentSupportController, 'enrollmentHealthGate'])
      .use(middleware.permission(['health.read', 'health.write', 'clearance.read', 'enrollments.read']))
      .as('sss.health.enrollment_gate')
    router
      .get('/sss/health/statistics', [StudentSupportController, 'healthProgramStatistics'])
      .use(middleware.permission(['health.read', 'reports.read']))
      .as('sss.health.statistics')
    router
      .get('/sss/health/students/:studentId/ehr', [StudentSupportController, 'studentEhrProfile'])
      .use(middleware.permission(['health.read', 'health.write', 'health.clinical.read']))
      .as('sss.health.ehr')
    router
      .post('/sss/health/conditions', [StudentSupportController, 'addHealthCondition'])
      .use(middleware.permission(['health.write', 'health.clinical.write']))
      .as('sss.health.conditions.store')
    router
      .post('/sss/health/alerts', [StudentSupportController, 'addMedicalAlert'])
      .use(middleware.permission(['health.write', 'health.clinical.write']))
      .as('sss.health.alerts.store')
    router
      .post('/sss/health/prescriptions', [StudentSupportController, 'addHealthPrescription'])
      .use(middleware.permission(['health.write', 'health.clinical.write']))
      .as('sss.health.prescriptions.store')
    router
      .post('/sss/health/hospital-referrals', [StudentSupportController, 'createHospitalReferral'])
      .use(middleware.permission(['health.write', 'health.clinical.write']))
      .as('sss.health.hospital_referrals.store')

    router.post('/sss/osa/discipline/complaints', [StudentSupportController, 'disciplineComplaint']).use(
      middleware.permission(['osa.write'])
    )
    router
      .get('/sss/osa/discipline/cases', [StudentSupportController, 'listDisciplineCases'])
      .use(middleware.permission(['osa.read', 'osa.write']))
      .as('sss.osa.discipline.cases.index')
    router
      .get('/sss/osa/discipline/cases/:id', [StudentSupportController, 'getDisciplineCase'])
      .use(middleware.permission(['osa.read', 'osa.write']))
      .as('sss.osa.discipline.cases.show')
    router
      .post('/sss/osa/discipline/cases/:id/advance', [StudentSupportController, 'advanceDisciplineCase'])
      .use(middleware.permission(['osa.write']))
      .as('sss.osa.discipline.cases.advance')
    router
      .post('/sss/osa/discipline/cases/:id/sanctions', [StudentSupportController, 'recordDisciplineSanction'])
      .use(middleware.permission(['osa.write']))
      .as('sss.osa.discipline.cases.sanctions.store')
    router
      .get('/sss/osa/discipline/students/:studentId/history', [StudentSupportController, 'disciplinaryHistory'])
      .use(middleware.permission(['osa.read', 'osa.write', 'students.read']))
      .as('sss.osa.discipline.history')
    router
      .get('/sss/osa/discipline/reports/cases', [StudentSupportController, 'disciplineCaseReport'])
      .use(middleware.permission(['osa.read', 'reports.read']))
      .as('sss.osa.discipline.reports.cases')
    router.get('/sss/osa/org-applications', [StudentSupportController, 'listOrgApplications']).use(
      middleware.permission(['osa.read', 'osa.write'])
    )
    router.get('/sss/osa/org-applications/:id', [StudentSupportController, 'getOrgApplication']).use(
      middleware.permission(['osa.read', 'osa.write'])
    )
    router.post('/sss/osa/org-applications', [StudentSupportController, 'submitOrgApplication']).use(
      middleware.permission(['osa.write', 'students.read'])
    )
    router
      .post('/sss/osa/org-applications/:id/advance', [StudentSupportController, 'advanceOrgApplication'])
      .use(middleware.permission(['osa.write']))
      .as('sss.osa.org_applications.advance')
    router.get('/sss/osa/organizations', [StudentSupportController, 'listStudentOrganizations']).use(
      middleware.permission(['osa.read', 'osa.write', 'students.read'])
    )
    router
      .get('/sss/osa/organizations/:id/certificate', [StudentSupportController, 'orgAccreditationCertificate'])
      .use(middleware.permission(['osa.read', 'osa.write', 'students.read']))
      .as('sss.osa.organizations.certificate')
    router.get('/sss/osa/id-requests', [StudentSupportController, 'listStudentIdRequests']).use(
      middleware.permission(['osa.read', 'osa.write', 'students.self'])
    )
    router.post('/sss/osa/id-requests', [StudentSupportController, 'submitStudentIdRequest']).use(
      middleware.permission(['osa.write', 'students.self'])
    )
    router
      .patch('/sss/osa/id-requests/:id', [StudentSupportController, 'updateStudentIdRequest'])
      .use(middleware.permission(['osa.write']))
      .as('sss.osa.id_requests.update')
    router
      .get('/sss/osa/id-requests/:id/digital-pdf', [StudentSupportController, 'downloadDigitalStudentIdPdf'])
      .use(middleware.permission(['osa.read', 'osa.write', 'students.self']))
      .as('sss.osa.id_requests.digital_pdf')
    router
      .get('/sss/osa/students/:studentId/participation', [StudentSupportController, 'studentParticipationProfile'])
      .use(middleware.permission(['osa.read', 'osa.write', 'students.read']))
      .as('sss.osa.students.participation')

    router.post('/sss/scholarships/programs', [StudentSupportController, 'scholarshipProgram']).use(
      middleware.permission(['scholarships.write'])
    )
    router.post('/sss/scholarships/applications', [StudentSupportController, 'scholarshipApply']).use(
      middleware.permission(['scholarships.write', 'students.self'])
    )
    router
      .get('/sss/scholarships/applications', [StudentSupportController, 'listScholarshipApplications'])
      .use(middleware.permission(['scholarships.read', 'scholarships.write']))
      .as('sss.scholarships.applications.index')
    router.post('/sss/scholarships/applications/:id/decide', [StudentSupportController, 'scholarshipDecide']).use(
      middleware.permission(['scholarships.write'])
    )
    router
      .get('/sss/scholarships/awards', [StudentSupportController, 'listScholarshipAwards'])
      .use(middleware.permission(['scholarships.read', 'scholarships.write']))
      .as('sss.scholarships.awards.index')
    router
      .get('/sss/scholarships/reports/assistance', [StudentSupportController, 'scholarshipAssistanceReport'])
      .use(middleware.permission(['scholarships.read', 'reports.read']))
      .as('sss.scholarships.reports.assistance')
    router
      .get('/sss/scholarships/sa-applications', [StudentSupportController, 'listSaApplications'])
      .use(middleware.permission(['scholarships.read', 'scholarships.write']))
      .as('sss.scholarships.sa.index')
    router
      .post('/sss/scholarships/sa-applications', [StudentSupportController, 'submitSaApplication'])
      .use(middleware.permission(['scholarships.write', 'students.self']))
      .as('sss.scholarships.sa.store')
    router
      .get('/sss/scholarships/sa-applications/:id', [StudentSupportController, 'getSaApplication'])
      .use(middleware.permission(['scholarships.read', 'scholarships.write']))
      .as('sss.scholarships.sa.show')
    router
      .patch('/sss/scholarships/sa-applications/:id/requirements', [StudentSupportController, 'updateSaRequirements'])
      .use(middleware.permission(['scholarships.write']))
      .as('sss.scholarships.sa.requirements')
    router
      .post('/sss/scholarships/sa-applications/:id/interview', [StudentSupportController, 'scheduleSaInterview'])
      .use(middleware.permission(['scholarships.write']))
      .as('sss.scholarships.sa.interview')
    router
      .post('/sss/scholarships/sa-applications/:id/advance', [StudentSupportController, 'advanceSaApplication'])
      .use(middleware.permission(['scholarships.write']))
      .as('sss.scholarships.sa.advance')

    router.get('/deficiencies', [DeficienciesController, 'index']).use(middleware.permission(['deficiencies.read']))
    router
      .get('/deficiencies/compliance-report', [DeficienciesController, 'complianceReport'])
      .use(middleware.permission(['deficiencies.read', 'reports.read']))
      .as('deficiencies.compliance_report')
    router.post('/deficiencies', [DeficienciesController, 'store']).use(middleware.permission(['deficiencies.write']))
    router
      .patch('/deficiencies/:id', [DeficienciesController, 'update'])
      .use(middleware.permission(['deficiencies.write']))
      .as('deficiencies.update')
    router
      .delete('/deficiencies/:id', [DeficienciesController, 'destroy'])
      .use(middleware.permission(['deficiencies.write']))
      .as('deficiencies.destroy')
    router
      .post('/deficiencies/:id/submit', [DeficienciesController, 'submit'])
      .use(middleware.permission(['deficiencies.write']))
      .as('deficiencies.submit')
    router
      .post('/deficiencies/:id/approve', [DeficienciesController, 'approve'])
      .use(middleware.permission(['deficiencies.write']))
      .as('deficiencies.approve')
    router
      .post('/deficiencies/:id/reject', [DeficienciesController, 'reject'])
      .use(middleware.permission(['deficiencies.write']))
      .as('deficiencies.reject')
    router.post('/deficiencies/:id/clear', [DeficienciesController, 'clear']).use(middleware.permission(['deficiencies.write']))

    router.get('/reports/catalog', [ReportsController, 'catalog'])
    router.get('/reports/definitions', [ReportsController, 'definitions'])
    router.get('/reports/dashboard', [ReportsController, 'dashboard'])
    router.get('/regulatory/hemis/schema', [ReportsController, 'hemisSchema']).use(
      middleware.permission(['reports.export'])
    )
    router.get('/reports/:reportId/export', [ReportsController, 'export'])
    router.get('/reports/:reportId', [ReportsController, 'show'])

    router.get('/announcements/settings', [AnnouncementsController, 'settingsIndex']).use(
      middleware.permission(['announcements.read'])
    )
    router.patch('/announcements/settings', [AnnouncementsController, 'settingsUpdate']).use(
      middleware.permission(['announcements.write'])
    )
    router.get('/announcements/feed', [AnnouncementsController, 'feed'])
    router.get('/announcements', [AnnouncementsController, 'index']).use(
      middleware.permission(['announcements.read'])
    )
    router.post('/announcements', [AnnouncementsController, 'store']).use(
      middleware.permission(['announcements.write'])
    )
    router.patch('/announcements/:id', [AnnouncementsController, 'update']).use(
      middleware.permission(['announcements.write'])
    )
    router.post('/announcements/:id/publish', [AnnouncementsController, 'publish']).use(
      middleware.permission(['announcements.write'])
    )
    router.post('/announcements/:id/archive', [AnnouncementsController, 'archive']).use(
      middleware.permission(['announcements.write'])
    )
    router.post('/announcements/:id/dispatch', [AnnouncementsController, 'dispatch']).use(
      middleware.permission(['announcements.write'])
    )
    router.post('/announcements/:id/like', [AnnouncementsController, 'toggleLike']).use(
      middleware.permission(['announcements.read', 'students.self', 'portal.student'])
    )
    router.post('/announcements/:id/comments', [AnnouncementsController, 'addComment']).use(
      middleware.permission(['announcements.read', 'students.self', 'portal.student'])
    )

    router.post('/mass-sms/preview', [MassCommsController, 'previewSms']).use(
      middleware.permission(['announcements.write'])
    )
    router.post('/mass-sms/campaigns', [MassCommsController, 'queueSms']).use(
      middleware.permission(['announcements.write'])
    )
    router.get('/mass-sms/campaigns', [MassCommsController, 'campaignsIndex']).use(
      middleware.permission(['announcements.read'])
    )
    router.post('/student-contacts', [MassCommsController, 'storeContact']).use(
      middleware.permission(['students.write', 'announcements.write'])
    )
    router.get('/surveys/pending', [MassCommsController, 'surveysPending']).use(
      middleware.permission(['announcements.read', 'students.self', 'portal.student'])
    )
    router.get('/surveys', [MassCommsController, 'surveysIndex']).use(
      middleware.permission(['announcements.read'])
    )
    router.post('/surveys', [MassCommsController, 'surveysStore']).use(
      middleware.permission(['announcements.write'])
    )
    router.post('/surveys/:id/publish', [MassCommsController, 'surveysPublish']).use(
      middleware.permission(['announcements.write'])
    )
    router.post('/surveys/:id/close', [MassCommsController, 'surveysClose']).use(
      middleware.permission(['announcements.write'])
    )
    router.get('/surveys/:id/results', [MassCommsController, 'surveysResults']).use(
      middleware.permission(['announcements.read'])
    )
    router.post('/surveys/:id/responses', [MassCommsController, 'surveysRespond']).use(
      middleware.permission(['announcements.read', 'students.self', 'portal.student'])
    )

    router.get('/faculty-eval/codes', [FacultyEvalController, 'codesIndex']).use(
      middleware.permission(['faculty_eval.read'])
    )
    router.post('/faculty-eval/codes', [FacultyEvalController, 'codesStore']).use(
      middleware.permission(['faculty_eval.write'])
    )
    router.get('/faculty-eval/questions', [FacultyEvalController, 'questionsIndex']).use(
      middleware.permission(['faculty_eval.read'])
    )
    router.post('/faculty-eval/questions', [FacultyEvalController, 'questionsStore']).use(
      middleware.permission(['faculty_eval.write'])
    )
    router.get('/faculty-eval/schedules', [FacultyEvalController, 'schedulesIndex']).use(
      middleware.permission(['faculty_eval.read'])
    )
    router.post('/faculty-eval/schedules', [FacultyEvalController, 'schedulesStore']).use(
      middleware.permission(['faculty_eval.write'])
    )
    router.post('/faculty-eval/schedules/:id/open', [FacultyEvalController, 'schedulesOpen']).use(
      middleware.permission(['faculty_eval.write'])
    )
    router.post('/faculty-eval/schedules/:id/close', [FacultyEvalController, 'schedulesClose']).use(
      middleware.permission(['faculty_eval.write'])
    )
    router.patch('/faculty-eval/schedules/:id/window', [FacultyEvalController, 'schedulesWindow']).use(
      middleware.permission(['faculty_eval.write'])
    )
    router.get('/faculty-eval/assignment-options', [FacultyEvalController, 'assignmentOptions']).use(
      middleware.permission(['faculty_eval.read'])
    )
    router.get('/faculty-eval/pending', [FacultyEvalController, 'pending']).use(
      middleware.permission(['faculty_eval.submit'])
    )
    router.post('/faculty-eval/responses', [FacultyEvalController, 'responsesStore']).use(
      middleware.permission(['faculty_eval.submit'])
    )
    router.get('/faculty-eval/reports/:scheduleId', [FacultyEvalController, 'report']).use(
      middleware.permission(['faculty_eval.read'])
    )
    router
      .get('/faculty-eval/reports/:scheduleId/export', [FacultyEvalController, 'reportExport'])
      .use(middleware.permission(['faculty_eval.read']))

    router.post('/students/:id/graduate', [GraduationController, 'graduate']).use(middleware.permission(['students.write']))

    router.get('/phase2/:moduleCode', [Phase2RecordsController, 'index']).use(middleware.permission(['enrollments.read']))
    router.post('/phase2/:moduleCode', [Phase2RecordsController, 'store']).use(middleware.permission(['enrollments.write']))

    router.get('/modules/phase2', [Phase2ModulesController, 'index']).use(
      middleware.permission(['enrollments.read'])
    )
  })
  .prefix('/api/v1/enrollment').as('enrollment')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/students/:studentNumber/grades-export', [InternalGradesController, 'exportStudentGrades'])
  })
  .prefix('/api/v1/enrollment/internal').as('enrollment.internal')
  .use(middleware.serviceApiKey())

router
  .group(() => {
    router.get('/public/institution-logos/:organizationId/:filename', [
      InstitutionalProfileController,
      'showLogo',
    ])
  })
  .prefix('/api/v1/enrollment')
  .as('enrollment.public')
