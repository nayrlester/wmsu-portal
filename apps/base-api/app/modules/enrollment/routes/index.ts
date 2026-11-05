import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/enrollment/middleware_registry'

const DocsController = () => import('#modules/enrollment/controllers/docs_controller')
const AuthController = () => import('#modules/enrollment/controllers/auth_controller')
const OrgController = () => import('#modules/enrollment/controllers/org_controller')
const UsersController = () => import('#modules/enrollment/controllers/users_controller')
const RolesController = () => import('#modules/enrollment/controllers/roles_controller')
const PermissionsController = () => import('#modules/enrollment/controllers/permissions_controller')


const ClearanceController = () => import('#modules/enrollment/controllers/clearance_controller')
const StudentSupportController = () =>
  import('#modules/enrollment/controllers/student_support_controller')
const AdmissionFormsController = () =>
  import('#modules/enrollment/controllers/admission_forms_controller')
const AdmissionEventsController = () =>
  import('#modules/enrollment/controllers/admission_events_controller')

// ── Public auth + docs ──
router
  .group(() => {
    router.get('/docs', [DocsController, 'swagger'])
    router.get('/docs/openapi.yaml', [DocsController, 'openapi'])
    router.post('/auth/login', [AuthController, 'login'])
      .use(middleware.rateLimit({ max: 10, timeMs: 15 * 60_000, prefix: 'login' }))
    router.post('/auth/refresh', [AuthController, 'refresh'])
      .use(middleware.rateLimit({ max: 30, timeMs: 60_000, prefix: 'refresh' }))
    router.get('/clearance/reports/verify/:token', [ClearanceController, 'verifyReport'])
    router
      .get('/sss/osa/id-requests/digital/verify/:token', [StudentSupportController, 'verifyDigitalStudentId'])
      .as('sss.osa.id_requests.digital_verify')
      .use(middleware.rateLimit({ max: 60, timeMs: 60_000, prefix: 'digital-id-verify' }))
    router
      .get('/admissions/form', [AdmissionFormsController, 'active'])
      .as('admissions.form.public')
      .use(middleware.rateLimit({ max: 60, timeMs: 60_000, prefix: 'admission-form' }))
    router
      .get('/admissions/programs', [AdmissionEventsController, 'publicPrograms'])
      .as('admissions.programs.public')
      .use(middleware.rateLimit({ max: 60, timeMs: 60_000, prefix: 'admission-programs' }))
    router
      .post('/admissions/apply', [AdmissionFormsController, 'applyOnline'])
      .as('admissions.apply.public')
      .use(middleware.rateLimit({ max: 20, timeMs: 15 * 60_000, prefix: 'admission-apply' }))
    router
      .post('/admissions/status', [AdmissionEventsController, 'portalStatus'])
      .as('admissions.status.public')
      .use(middleware.rateLimit({ max: 30, timeMs: 15 * 60_000, prefix: 'admission-status' }))
    router
      .post('/admissions/journey', [AdmissionEventsController, 'guestJourneyUpdate'])
      .as('admissions.journey.public')
      .use(middleware.rateLimit({ max: 30, timeMs: 15 * 60_000, prefix: 'admission-journey' }))
    router
      .post('/admissions/exam/open', [AdmissionEventsController, 'guestExamOpen'])
      .as('admissions.exam.open.public')
      .use(middleware.rateLimit({ max: 20, timeMs: 15 * 60_000, prefix: 'admission-exam-open' }))
    router
      .post('/admissions/exam/submit', [AdmissionEventsController, 'guestExamSubmit'])
      .as('admissions.exam.submit.public')
      .use(middleware.rateLimit({ max: 20, timeMs: 15 * 60_000, prefix: 'admission-exam-submit' }))
  })
  .prefix('/api/v1/enrollment').as('enrollment')

router
  .group(() => {
    router.post('/auth/logout', [AuthController, 'logout'])
    router.get('/auth/me', [AuthController, 'me'])

    router.get('/org', [OrgController, 'show']).use(middleware.permission(['org.read']))
    router.patch('/org', [OrgController, 'update']).use(middleware.permission(['org.write']))

    router.get('/org/campuses', [OrgController, 'listCampuses']).use(middleware.permission(['org.read']))
    router.post('/org/campuses', [OrgController, 'createCampus']).use(middleware.permission(['org.write']))
    router.get('/org/campuses/:id', [OrgController, 'getCampus']).use(middleware.permission(['org.read']))
    router.patch('/org/campuses/:id', [OrgController, 'updateCampus']).use(middleware.permission(['org.write']))
    router.delete('/org/campuses/:id', [OrgController, 'deleteCampus']).use(middleware.permission(['org.write']))

    router.get('/org/offices', [OrgController, 'listOffices']).use(middleware.permission(['org.read']))
    router.post('/org/offices', [OrgController, 'createOffice']).use(middleware.permission(['org.write']))
    router.get('/org/offices/:id', [OrgController, 'getOffice']).use(middleware.permission(['org.read']))
    router.patch('/org/offices/:id', [OrgController, 'updateOffice']).use(middleware.permission(['org.write']))
    router.delete('/org/offices/:id', [OrgController, 'deleteOffice']).use(middleware.permission(['org.write']))

    router.get('/org/departments', [OrgController, 'listDepartments']).use(middleware.permission(['org.read']))
    router.post('/org/departments', [OrgController, 'createDepartment']).use(middleware.permission(['org.write']))
    router.get('/org/departments/:id', [OrgController, 'getDepartment']).use(middleware.permission(['org.read']))
    router.patch('/org/departments/:id', [OrgController, 'updateDepartment']).use(middleware.permission(['org.write']))
    router.delete('/org/departments/:id', [OrgController, 'deleteDepartment']).use(middleware.permission(['org.write']))

    router.get('/users', [UsersController, 'index']).use(middleware.permission(['users.read']))
    router.post('/users', [UsersController, 'store']).use(middleware.permission(['users.write']))
    router.get('/users/:id', [UsersController, 'show']).use(middleware.permission(['users.read']))
    router.patch('/users/:id', [UsersController, 'update']).use(middleware.permission(['users.write']))
    router.delete('/users/:id', [UsersController, 'destroy']).use(middleware.permission(['users.write']))

    router.get('/permissions', [PermissionsController, 'index']).use(middleware.permission(['roles.read']))
    router.get('/roles', [RolesController, 'index']).use(middleware.permission(['roles.read']))
    router.post('/roles', [RolesController, 'store']).use(middleware.permission(['roles.write']))
    router.get('/roles/:id', [RolesController, 'show']).use(middleware.permission(['roles.read']))
    router.patch('/roles/:id', [RolesController, 'update']).use(middleware.permission(['roles.write']))
    router.delete('/roles/:id', [RolesController, 'destroy']).use(middleware.permission(['roles.write']))

  })
  .prefix('/api/v1/enrollment').as('enrollment')
  .use(middleware.auth())

import './enrollment.js'
