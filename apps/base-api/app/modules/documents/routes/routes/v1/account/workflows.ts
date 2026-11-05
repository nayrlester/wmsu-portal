import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const WorkflowsController = () => import('#modules/documents/controllers/workflows_controller')
const DocumentTypeWorkflowsController = () => import('#modules/documents/controllers/document_type_workflows_controller')

const workflowsManage = () => middleware.permission(['workflows.manage'])

export function registerAccountWorkflowRoutes() {
  router.get('workflows', [WorkflowsController, 'index']).use(workflowsManage())
  router.post('workflows', [WorkflowsController, 'store']).use(workflowsManage())
  router.get('workflows/:id', [WorkflowsController, 'show']).use(workflowsManage())
  router.put('workflows/:id', [WorkflowsController, 'update']).use(workflowsManage())
  router.delete('workflows/:id', [WorkflowsController, 'destroy']).use(workflowsManage())
  router.post('workflows/:id/publish', [WorkflowsController, 'publish']).use(workflowsManage())
  router.post('workflows/:id/archive', [WorkflowsController, 'archive']).use(workflowsManage())
  router.post('workflows/:id/simulate', [WorkflowsController, 'simulate']).use(workflowsManage())
  router
    .post('document-types/:documentTypeId/workflow', [DocumentTypeWorkflowsController, 'assign'])
    .use(workflowsManage())
}
