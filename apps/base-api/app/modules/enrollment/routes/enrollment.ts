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
const FacultyEvalController = () => import('#modules/enrollment/controllers/faculty_eval_controller')
const StudentPortalController = () => import('#modules/enrollment/controllers/student_portal_controller')
const SchedulingController = () => import('#modules/enrollment/controllers/scheduling_controller')
const AcademicFacilitiesController = () =>
  import('#modules/enrollment/controllers/academic_facilities_controller')
const AcademicPoliciesController = () =>
  import('#modules/enrollment/controllers/academic_policies_controller')
const InstitutionalProfileController = () =>
  import('#modules/enrollment/controllers/institutional_profile_controller')

router
  .group(() => {
    router.get('/applicants', [ApplicantsController, 'index']).use(middleware.permission(['applicants.read']))
    router.post('/applicants', [ApplicantsController, 'store']).use(middleware.permission(['applicants.write']))
    router.get('/applicants/:id', [ApplicantsController, 'show']).use(middleware.permission(['applicants.read']))
    router.patch('/applicants/:id', [ApplicantsController, 'update']).use(middleware.permission(['applicants.write']))
    router.post('/applicants/:id/admit', [ApplicantsController, 'admit']).use(middleware.permission(['applicants.write']))

    router.get('/students/me', [StudentsController, 'me']).use(middleware.permission(['students.self']))
    router.get('/student-portal/task-calendar', [StudentPortalController, 'taskCalendar']).use(
      middleware.permission(['students.self'])
    )
    router.get('/student-portal/enrollment-policy', [StudentPortalController, 'enrollmentPolicy']).use(
      middleware.permission(['students.self', 'portal.student'])
    )
    router.get('/students', [StudentsController, 'index']).use(middleware.permission(['students.read']))
    router.get('/students/:id', [StudentsController, 'show']).use(middleware.permission(['students.read']))

    router.post('/scheduling/sections/:sectionId/meetings', [SchedulingController, 'upsertMeeting']).use(
      middleware.permission(['academic.write'])
    )
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
    router.get('/scheduling/sections/:sectionId/waitlist', [SchedulingController, 'sectionWaitlist']).use(
      middleware.permission(['enrollments.read', 'academic.read'])
    )
    router.get('/scheduling/sections/:sectionId/meetings', [SchedulingController, 'listMeetings']).use(
      middleware.permission(['academic.read'])
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
    router.post('/scheduling/class-codes/resolve', [SchedulingController, 'resolveClassCodes']).use(
      middleware.permission(['students.self', 'enrollments.read', 'academic.read'])
    )
    router.post('/scheduling/alternate-sections/search', [SchedulingController, 'searchAlternateSections']).use(
      middleware.permission(['students.self', 'enrollments.read'])
    )
    router.post('/scheduling/class-codes/apply', [SchedulingController, 'applyClassCodes']).use(
      middleware.permission(['students.self', 'enrollments.write'])
    )

    router.get('/academic/years', [AcademicSetupController, 'listAcademicYears']).use(middleware.permission(['academic.read']))
    router.post('/academic/years', [AcademicSetupController, 'createAcademicYear']).use(middleware.permission(['academic.write']))
    router.get('/academic/programs', [AcademicSetupController, 'listPrograms']).use(middleware.permission(['academic.read']))
    router.post('/academic/programs', [AcademicSetupController, 'createProgram']).use(middleware.permission(['academic.write']))
    router.get('/academic/sections', [AcademicSetupController, 'listSections']).use(middleware.permission(['academic.read']))
    router.post('/academic/sections', [AcademicSetupController, 'createSection']).use(middleware.permission(['academic.write']))
    router.patch('/academic/sections/:id', [AcademicSetupController, 'updateSection']).use(middleware.permission(['academic.write']))

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

    router.get('/academic/subjects', [SubjectsController, 'index']).use(
      middleware.permission(['academic.read', 'subjects.read'])
    )
    router.post('/academic/subjects', [SubjectsController, 'store']).use(middleware.permission(['academic.write']))

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
    router.get('/grades/class-records/:id/master-list', [GradeRecordsController, 'classMasterList']).use(
      middleware.permission(['grades.read'])
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
      middleware.permission(['enrollments.write', 'assessments.write'])
    )
    router.get('/assessments/documents', [AssessmentFinanceController, 'listDocuments']).use(
      middleware.permission(['assessments.read'])
    )
    router.get('/assessments/documents/verify/:qrToken', [AssessmentFinanceController, 'verifyDocument'])
    router.get('/assessments/integration-transactions', [AssessmentFinanceController, 'integrationHistory']).use(
      middleware.permission(['assessments.read'])
    )
    router.get('/assessments/students/:studentId/monitor', [AssessmentFinanceController, 'studentMonitor']).use(
      middleware.permission(['assessments.read', 'deficiencies.read'])
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
    router.get('/clearance/reports/:token', [ClearanceController, 'showReport']).use(middleware.permission(['clearance.read']))
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
      middleware.permission(['guidance.write', 'health.write', 'osa.write', 'queue.self'])
    )
    router.get('/sss/offices/:office/report', [StudentSupportController, 'officeReport']).use(
      middleware.permission(['guidance.read', 'health.read', 'osa.read', 'scholarships.read', 'sss.admin'])
    )
    router.get('/sss/students/:studentId/clearance-hints', [StudentSupportController, 'clearanceHints']).use(
      middleware.permission(['clearance.read', 'sss.admin'])
    )
    router.get('/sss/sensitive-access-logs', [StudentSupportController, 'sensitiveAccessLog']).use(
      middleware.permission(['sss.admin'])
    )

    router.post('/sss/guidance/counseling-requests', [StudentSupportController, 'counselingRequest']).use(
      middleware.permission(['guidance.write', 'counseling.self'])
    )
    router.post('/sss/guidance/case-notes', [StudentSupportController, 'writeCaseNote']).use(
      middleware.permission(['guidance.case_notes.write'])
    )
    router.get('/sss/guidance/counseling-requests/:id/case-notes', [StudentSupportController, 'readCaseNotes']).use(
      middleware.permission(['guidance.case_notes.read'])
    )

    router.post('/sss/health/encounters', [StudentSupportController, 'healthEncounter']).use(
      middleware.permission(['health.write', 'health.clinical.write'])
    )
    router.get('/sss/health/encounters/:id/clinical-notes', [StudentSupportController, 'readClinicalNotes']).use(
      middleware.permission(['health.clinical.read'])
    )
    router.post('/sss/health/clearances', [StudentSupportController, 'healthClearance']).use(
      middleware.permission(['health.write'])
    )

    router.post('/sss/osa/discipline/complaints', [StudentSupportController, 'disciplineComplaint']).use(
      middleware.permission(['osa.write'])
    )

    router.post('/sss/scholarships/programs', [StudentSupportController, 'scholarshipProgram']).use(
      middleware.permission(['scholarships.write'])
    )
    router.post('/sss/scholarships/applications', [StudentSupportController, 'scholarshipApply']).use(
      middleware.permission(['scholarships.write'])
    )
    router.post('/sss/scholarships/applications/:id/decide', [StudentSupportController, 'scholarshipDecide']).use(
      middleware.permission(['scholarships.write'])
    )

    router.get('/deficiencies', [DeficienciesController, 'index']).use(middleware.permission(['deficiencies.read']))
    router.post('/deficiencies', [DeficienciesController, 'store']).use(middleware.permission(['deficiencies.write']))
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
