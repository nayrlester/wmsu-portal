import type { HttpContext } from '@adonisjs/core/http'
import { workflowService } from '#modules/documents/services/workflow_service'
import { WorkflowSerializer } from '#presentation/workflows/workflow_serializer'
import {
  createWorkflowValidator,
  updateWorkflowValidator,
  listWorkflowsValidator,
} from '#modules/documents/validators/workflow'

export default class WorkflowsController {
  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listWorkflowsValidator, {
      data: request.qs(),
    })
    const workflows = await workflowService.list(filters)
    return response.ok(WorkflowSerializer.serializePaginated(workflows))
  }

  async show({ params, response }: HttpContext) {
    const workflow = await workflowService.findById(params.id)
    return response.ok({ workflow: WorkflowSerializer.serialize(workflow) })
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createWorkflowValidator)
    const workflow = await workflowService.create(payload, auth.user!.id)
    return response.created({ workflow: WorkflowSerializer.serialize(workflow) })
  }

  async update({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(updateWorkflowValidator)
    const workflow = await workflowService.update(params.id, payload, auth.user!.id)
    return response.ok({ workflow: WorkflowSerializer.serialize(workflow) })
  }

  async destroy({ params, auth, response }: HttpContext) {
    await workflowService.delete(params.id, auth.user!.id)
    return response.ok({ message: 'Workflow deleted successfully' })
  }

  async publish({ params, auth, response }: HttpContext) {
    const workflow = await workflowService.publish(params.id, auth.user!.id)
    return response.ok({
      message: 'Workflow published successfully',
      workflow: WorkflowSerializer.serialize(workflow),
    })
  }

  async archive({ params, auth, response }: HttpContext) {
    const workflow = await workflowService.archive(params.id, auth.user!.id)
    return response.ok({
      message: 'Workflow archived successfully',
      workflow: WorkflowSerializer.serialize(workflow),
    })
  }

  async simulate({ params, request, response }: HttpContext) {
    const priority = (request.input('priority') as string | undefined) ?? 'medium'
    const departmentId = (request.input('departmentId') as string | null | undefined) ?? null
    const documentTypeId = (request.input('documentTypeId') as string | null | undefined) ?? null
    const result = await workflowService.simulate(params.id, {
      priority,
      departmentId,
      documentTypeId,
    })
    return response.ok(result)
  }
}
