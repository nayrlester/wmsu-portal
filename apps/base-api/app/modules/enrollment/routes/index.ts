import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/enrollment/middleware_registry'

const DocsController = () => import('#modules/enrollment/controllers/docs_controller')
const AuthController = () => import('#modules/enrollment/controllers/auth_controller')
const OrgController = () => import('#modules/enrollment/controllers/org_controller')
const UsersController = () => import('#modules/enrollment/controllers/users_controller')
const RolesController = () => import('#modules/enrollment/controllers/roles_controller')
const PermissionsController = () => import('#modules/enrollment/controllers/permissions_controller')


const ClearanceController = () => import('#modules/enrollment/controllers/clearance_controller')

// ── Public auth + docs ──
router
  .group(() => {
    router.get('/docs', [DocsController, 'swagger'])
    router.get('/docs/openapi.yaml', [DocsController, 'openapi'])
    router.post('/auth/login', [AuthController, 'login'])
      .use(middleware.rateLimit({ max: 10, windowMs: 15 * 60_000, prefix: 'login' }))
    router.post('/auth/refresh', [AuthController, 'refresh'])
      .use(middleware.rateLimit({ max: 30, windowMs: 60_000, prefix: 'refresh' }))
    router.get('/clearance/reports/verify/:token', [ClearanceController, 'verifyReport'])
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
