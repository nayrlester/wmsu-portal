import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const DepartmentsController = () => import('#modules/documents/controllers/departments_controller')
const settingsManage = () => middleware.permission(['settings.manage'])

export function registerAccountDepartmentRoutes() {
  router.get('departments', [DepartmentsController, 'index']).use(settingsManage())
  router.post('departments', [DepartmentsController, 'store']).use(settingsManage())
  router.put('departments/:id', [DepartmentsController, 'update']).use(settingsManage())
  router.delete('departments/:id', [DepartmentsController, 'destroy']).use(settingsManage())
}
